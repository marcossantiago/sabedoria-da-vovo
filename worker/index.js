const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return jsonError('Método não permitido', 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError('JSON inválido', 400);
    }

    if (env.FORM_PASSWORD && body.password !== env.FORM_PASSWORD) {
      return jsonError('Senha incorreta', 401);
    }

    const text    = body.text?.trim();
    const author  = body.author?.trim()  || null;
    const context = body.context?.trim() || null;

    if (!text) {
      return jsonError('O ditado é obrigatório', 400);
    }

    try {
      const prUrl = await createPR(env, text, author, context);
      return json({ ok: true, pr: prUrl });
    } catch (err) {
      console.error(err);
      return jsonError(err.message, 500);
    }
  },
};

async function createPR(env, text, author, context) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = 'main' } = env;

  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN não configurado');

  const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'sabedoria-worker/1.0',
  };

  const today = new Date().toISOString().split('T')[0];
  const timestamp = Date.now();
  const branchName = `novo-ditado-${timestamp}`;
  const entryPath = `sayings/entries/${timestamp}.json`;
  const entryContent = encodeBase64(JSON.stringify(
    { text, author, date: today, context, image: null },
    null, 2
  ) + '\n');

  // Get current SHA of the base branch
  const refRes = await ghFetch(`${api}/git/ref/heads/${GITHUB_BRANCH}`, { headers });
  const { object: { sha: branchSha } } = await refRes.json();

  // Create a new branch
  await ghFetch(`${api}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: branchSha }),
  });

  // Commit the single entry file to the new branch
  await ghFetch(`${api}/contents/${entryPath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Novo ditado: "${text.substring(0, 60)}"`,
      content: entryContent,
      branch: branchName,
    }),
  });

  // Open the Pull Request
  const prRes = await ghFetch(`${api}/pulls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `Novo ditado: "${text.substring(0, 60)}"`,
      body: [
        '**Novo ditado sugerido pelo formulário do site**',
        '',
        `> ${text}`,
        '',
        `**Autor:** ${author}`,
        `**Contexto:** ${context ?? 'N/A'}`,
        `**Data:** ${today}`,
      ].join('\n'),
      head: branchName,
      base: GITHUB_BRANCH,
    }),
  });

  const pr = await prRes.json();

  // Tag the maintainer as reviewer
  await ghFetch(`${api}/pulls/${pr.number}/requested_reviewers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reviewers: [GITHUB_OWNER] }),
  });

  return pr.html_url;
}

// GitHub fetch wrapper — throws on non-2xx
async function ghFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub API error ${res.status} on ${url}`);
  }
  return res;
}

// UTF-8 safe base64 encode
function encodeBase64(str) {
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes));
}

// UTF-8 safe base64 decode (GitHub API returns base64 with newlines)
function decodeBase64(str) {
  const binary = atob(str.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status = 400) {
  return json({ error: message }, status);
}
