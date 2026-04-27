#!/usr/bin/env bash
# Merge all open PRs one-by-one, rebasing each against main first.
# Resolves the conflict caused by all PRs appending to the same sayings/data.json.
#
# Usage: ./scripts/merge-prs.sh [--repo owner/repo]
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
REPO_DIR="$(git rev-parse --show-toplevel)"

echo "Repository : $REPO"
echo "Local dir  : $REPO_DIR"
cd "$REPO_DIR"

mapfile -t BRANCHES < <(
  gh pr list --repo "$REPO" --json number,headRefName \
    --jq 'sort_by(.number)[] | "\(.number) \(.headRefName)"'
)

if [ ${#BRANCHES[@]} -eq 0 ]; then
  echo "No open PRs found."
  exit 0
fi

for entry in "${BRANCHES[@]}"; do
  PR=$(echo "$entry" | cut -d' ' -f1)
  BRANCH=$(echo "$entry" | cut -d' ' -f2)
  COMMIT=$(git log "origin/$BRANCH" --not "origin/main" --format="%H" | head -1)

  echo ""
  echo "=== PR #$PR  ($BRANCH) ==="

  git checkout main --quiet
  git pull origin main --quiet
  git checkout -b "$BRANCH" "origin/$BRANCH" --quiet 2>/dev/null || git checkout "$BRANCH" --quiet

  if git rebase main; then
    echo "  No conflict — rebased cleanly."
  else
    echo "  Conflict detected — resolving..."

    # Extract the new entry's fields from the branch commit diff
    TEXT=$(git show "$COMMIT" -- sayings/data.json \
      | grep '^\+.*"text"' | head -1 \
      | sed 's/.*"text": "\(.*\)".*/\1/')
    AUTHOR=$(git show "$COMMIT" -- sayings/data.json \
      | grep '^\+.*"author"' | head -1 \
      | sed 's/.*"author": "\(.*\)".*/\1/')
    DATE=$(git show "$COMMIT" -- sayings/data.json \
      | grep '^\+.*"date"' | head -1 \
      | sed 's/.*"date": "\(.*\)".*/\1/')

    echo "  Adding: \"$TEXT\" (by $AUTHOR)"

    python3 - "$TEXT" "$AUTHOR" "$DATE" <<'PYEOF'
import sys, json, re

text, author, date = sys.argv[1], sys.argv[2], sys.argv[3]

with open('sayings/data.json', 'r') as f:
    content = f.read()

# Keep HEAD side of the conflict, discard branch side
resolved = re.sub(
    r'<<<<<<< HEAD\n(.*?)=======\n.*?>>>>>>> [^\n]+\n',
    r'\1',
    content,
    flags=re.DOTALL,
)

with open('sayings/data.json', 'w') as f:
    f.write(resolved)

data = json.load(open('sayings/data.json'))
data.append({"text": text, "author": author, "date": date, "context": None, "image": None})

with open('sayings/data.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f"  JSON valid: {len(data)} entries, last: {data[-1]['text'][:60]}")
PYEOF

    git add sayings/data.json
    GIT_EDITOR=true git rebase --continue
  fi

  git push origin "$BRANCH" --force

  STATUS=$(gh pr view "$PR" --repo "$REPO" --json state --jq '.state')
  if [ "$STATUS" = "MERGED" ]; then
    echo "  PR #$PR auto-merged after push."
  else
    gh pr merge "$PR" --repo "$REPO" --merge --delete-branch
    echo "  PR #$PR merged."
  fi

  git checkout main --quiet
  git pull origin main --quiet
  git branch -D "$BRANCH" 2>/dev/null || true
done

echo ""
echo "=== Done. Remaining open PRs ==="
gh pr list --repo "$REPO" || echo "(none)"
