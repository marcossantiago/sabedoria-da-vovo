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
    const author  = body.author?.trim()  || 'Vó';
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

  // Fetch current data.json from GitHub
  const fileRes = await ghFetch(`${api}/contents/sayings/data.json?ref=${GITHUB_BRANCH}`, { headers });
  const fileData = await fileRes.json();
  const current = JSON.parse(decodeBase64(fileData.content));

  // Append new saying
  const today = new Date().toISOString().split('T')[0];
  current.push({ text, author, date: today, context, image: null });

  // Get current SHA of the branch
  const refRes = await ghFetch(`${api}/git/ref/heads/${GITHUB_BRANCH}`, { headers });
  const { object: { sha: branchSha } } = await refRes.json();

  // Create a new branch
  const branchName = `novo-ditado-${Date.now()}`;
  await ghFetch(`${api}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: branchSha }),
  });

  // Commit updated data.json to the new branch
  await ghFetch(`${api}/contents/sayings/data.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Novo ditado: "${text.substring(0, 60)}"`,
      content: encodeBase64(JSON.stringify(current, null, 2)),
      branch: branchName,
      sha: fileData.sha,
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
