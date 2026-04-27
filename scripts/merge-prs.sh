#!/usr/bin/env bash
# Merge all open PRs one-by-one, rebasing each against main first.
# New PRs add individual sayings/entries/*.json files so conflicts no longer occur.
# This script is kept for bulk merging convenience.
#
# Usage: ./scripts/merge-prs.sh [--repo owner/repo]
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
REPO_DIR="$(git rev-parse --show-toplevel)"

echo "Repository : $REPO"
echo "Local dir  : $REPO_DIR"
cd "$REPO_DIR"

git fetch --all --prune --quiet

# Stash local changes so checkouts and pulls work cleanly; restore on exit
STASHED=false
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push --include-untracked -m "merge-prs: auto-stash" --quiet
  STASHED=true
  echo "Stashed local changes (will restore on exit)."
fi
trap '[ "$STASHED" = true ] && git stash pop --quiet && echo "Restored stashed changes."' EXIT

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

  echo ""
  echo "=== PR #$PR  ($BRANCH) ==="

  git checkout main --quiet
  git pull --ff-only origin main --quiet
  git checkout -b "$BRANCH" "origin/$BRANCH" --quiet 2>/dev/null || git checkout "$BRANCH" --quiet

  if git rebase main; then
    echo "  No conflict — rebased cleanly."
  else
    echo "  Unexpected conflict. Aborting rebase for PR #$PR — please resolve manually."
    git rebase --abort
    continue
  fi

  git push origin "$BRANCH" --force

  # Retry merge up to 3 times to handle GitHub's "Base branch was modified" race
  MERGED=false
  for attempt in 1 2 3; do
    STATUS=$(gh pr view "$PR" --repo "$REPO" --json state --jq '.state')
    if [ "$STATUS" = "MERGED" ]; then
      echo "  PR #$PR auto-merged after push."
      MERGED=true
      break
    fi
    if gh pr merge "$PR" --repo "$REPO" --merge --delete-branch 2>&1; then
      echo "  PR #$PR merged."
      MERGED=true
      break
    fi
    echo "  Merge attempt $attempt failed, retrying in 5s..."
    sleep 5
  done
  [ "$MERGED" = true ] || { echo "  ERROR: could not merge PR #$PR after 3 attempts."; exit 1; }

  git checkout main --quiet
  sleep 3
  git pull --ff-only origin main --quiet
  git branch -D "$BRANCH" 2>/dev/null || true
done

echo ""
echo "=== Done. Remaining open PRs ==="
gh pr list --repo "$REPO" || echo "(none)"
