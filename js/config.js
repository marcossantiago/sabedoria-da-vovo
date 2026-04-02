// ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────────
// Edite este arquivo para personalizar o site.
// O campo apiEndpoint é injetado automaticamente pelo GitHub Actions no deploy.
// ───────────────────────────────────────────────────────────────────────────────

const SABEDORIA_CONFIG = {
  // URL do Cloudflare Worker — preenchido automaticamente no deploy.
  // Para desenvolvimento local: inicie o worker com `npm run dev` na pasta worker/
  // e coloque aqui a URL local (ex: http://localhost:8787)
  apiEndpoint: '',

  // Nome do site e da vovó
  siteName: 'Sabedoria da Eulina',
  grandmaName: 'Eulina',
  grandmaAge: 92,
};
