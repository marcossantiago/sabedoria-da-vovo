# ✨ Sabedoria da Vovó

Um site estático, leve e bonito para preservar e compartilhar a sabedoria da sua avó — seus ditados, histórias e lições de vida.

**100% estático. Hospedagem gratuita no GitHub Pages. Zero dependências.**

---

## Funcionalidades

- **Bolhas Flutuantes** — Página inicial com os ditados em bolhas clicáveis e bonitas
- **Arquivo Completo** — Lista com busca de todos os ditados e animações de rolagem
- **Visualização Individual** — Cada ditado tem sua própria página compartilhável com foto opcional
- **Botão Aleatório** — Botão flutuante para descobrir um ditado aleatório
- **Formulário Familiar** — Formulário protegido por senha para enviar novos ditados
- **Integração com PR do GitHub** — O formulário pode criar Pull Requests automaticamente
- **Responsivo** — Totalmente adaptado para dispositivos móveis
- **Sem Frameworks** — HTML/CSS/JS puro, extremamente leve

## Configuração Rápida

1. **Faça um fork/clone** deste repositório
2. **Edite** a seção CONFIG em `js/app.js` (nome de usuário, nome do repositório, senha)
3. **Edite** `sayings/data.json` com os seus ditados reais
4. **Ative o GitHub Pages** (Configurações → Pages → branch main, raiz)
5. **Pronto!** Disponível em `https://SEU_USUARIO.github.io/sabedoria-da-vovo/`

## Adicionando Ditados

Edite `sayings/data.json` — cada ditado possui: `id`, `text`, `author`, `date`, `context`, `image` (nome de arquivo opcional da pasta `img/`).

Ou use o formulário familiar em `#/adicionar` com a senha compartilhada.

## Hospedagem: R$0

GitHub Pages, Cloudflare Pages, Netlify ou Vercel — todos gratuitos para sites estáticos.

## Estrutura de Arquivos

```
├── index.html          # Arquivo HTML único
├── css/style.css       # Todos os estilos
├── js/app.js           # Roteador SPA, bolhas, lógica do formulário
├── sayings/data.json   # Todos os ditados
├── img/                # Fotos opcionais
└── README.md
```

Feito com ♥ pela família.
