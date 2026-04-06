(function () {
  'use strict';

  const CONFIG = SABEDORIA_CONFIG;

  let sayings = [];
  let currentSayingId = null;

  async function init() {
    applyConfig();
    await loadSayings();
    setupRouter();
    setupNav();
    setupRandomButton();
    handleRoute();
  }

  function applyConfig() {
    const name = CONFIG.grandmaName;
    const site = CONFIG.siteName;
    const age  = CONFIG.grandmaAge;

    document.title = site;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', `${site} — Uma coleção de ditados e sabedoria da nossa ${name} querida.`);

    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) navLogo.textContent = site;

    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = site;

    const heroAge = document.querySelector('.hero-age');
    if (heroAge) heroAge.textContent = age ? `${age} anos de histórias & verdades` : '';

    const fieldContext = document.getElementById('field-context');
    if (fieldContext) fieldContext.placeholder = `Quando ${name} costuma dizer isso?`;

    const fieldAuthor = document.getElementById('field-author');
    if (fieldAuthor) fieldAuthor.placeholder = 'Seu nome';
  }

  async function loadSayings() {
    try {
      const res = await fetch('sayings/data.json');
      const data = await res.json();
      sayings = data.map((s, i) => ({ ...s, id: i + 1 }));
    } catch (e) {
      console.error('Failed to load sayings:', e);
      sayings = [];
    }
  }

  function setupRouter() { window.addEventListener('hashchange', handleRoute); }

  function handleRoute() {
    const hash = window.location.hash || '#/';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    if (hash === '#/' || hash === '') {
      showPage('page-home'); renderBubbles();
    } else if (hash === '#/ditados') {
      showPage('page-list'); renderList();
    } else if (hash.startsWith('#/ditado/')) {
      showPage('page-single'); renderSingle(parseInt(hash.split('/')[2]));
    } else if (hash === '#/aleatorio') {
      const r = sayings[Math.floor(Math.random() * sayings.length)];
      if (r) window.location.hash = '#/ditado/' + r.id;
    } else if (hash === '#/adicionar') {
      showPage('page-form'); setupForm();
    } else {
      showPage('page-home'); renderBubbles();
    }
  }

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) { page.classList.add('active'); window.scrollTo(0, 0); }
  }

  function navigate(hash) { window.location.hash = hash; }

  function setupNav() {
    const nav = document.querySelector('.site-nav');
    const hamburger = document.querySelector('.nav-hamburger');
    const links = document.querySelector('.nav-links');
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50));
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        links.classList.toggle('open');
      });
      links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        links.classList.remove('open');
      }));
    }
  }

  function setupRandomButton() {
    const btn = document.querySelector('.random-float');
    if (btn) btn.addEventListener('click', () => {
      const r = sayings[Math.floor(Math.random() * sayings.length)];
      if (r) navigate('#/ditado/' + r.id);
    });
  }

  // ─── BUBBLES ───
  function renderBubbles() {
    const container = document.getElementById('bubbles');
    if (!container) return;
    container.innerHTML = '';
    const styles = ['bubble-style-1','bubble-style-2','bubble-style-3','bubble-style-4'];
    const count = Math.min(sayings.length, window.innerWidth < 768 ? 6 : 12);
    const shuffled = [...sayings].sort(() => Math.random() - 0.5).slice(0, count);
    const placed = [];

    shuffled.forEach((saying, i) => {
      const bubble = document.createElement('div');
      const size = 120 + Math.random() * 80;
      const style = styles[i % styles.length];
      let x, y, attempts = 0;
      do {
        x = 5 + Math.random() * (90 - (size / window.innerWidth * 100));
        y = 5 + Math.random() * (85 - (size / window.innerHeight * 100));
        attempts++;
      } while (attempts < 50 && placed.some(p => Math.sqrt((x-p.x)**2 + (y-p.y)**2) < 12));
      placed.push({ x, y });

      bubble.className = `bubble ${style}`;
      bubble.style.cssText = `width:${size}px;height:${size}px;left:${x}%;top:${y}%;animation-delay:${i*-2.5}s;animation-duration:${18+Math.random()*8}s;`;
      bubble.innerHTML = `<span class="bubble-text">${esc(saying.text)}</span>`;
      bubble.addEventListener('click', () => navigate('#/ditado/' + saying.id));
      container.appendChild(bubble);
    });
  }

  // ─── LIST ───
  function renderList() {
    const container = document.getElementById('sayings-list');
    const counter = document.getElementById('sayings-counter');
    const search = document.getElementById('search-input');
    if (!container) return;

    function render(filter = '') {
      const filtered = filter
        ? sayings.filter(s => s.text.toLowerCase().includes(filter.toLowerCase()) || (s.context && s.context.toLowerCase().includes(filter.toLowerCase())))
        : sayings;
      if (counter) counter.textContent = `${filtered.length} ditado${filtered.length !== 1 ? 's' : ''}`;
      container.innerHTML = filtered.map(s => `
        <div class="saying-card" data-id="${s.id}">
          ${s.image ? `<img class="saying-image" src="img/${s.image}" alt="" loading="lazy">` : ''}
          <blockquote>${esc(s.text)}</blockquote>
          ${s.context ? `<p class="context">${esc(s.context)}</p>` : ''}
          <div class="meta">
            <span>${s.author ? `Ouvido por ${esc(s.author)} &middot; ` : ''}${fmtDate(s.date)}</span>
            <button class="share-btn" onclick="event.stopPropagation();window.sabedoria.share(${s.id})" title="Compartilhar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
            </button>
          </div>
        </div>`).join('');

      setTimeout(() => container.querySelectorAll('.saying-card').forEach((c, i) => setTimeout(() => c.classList.add('visible'), i * 80)), 50);
      container.querySelectorAll('.saying-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => { if (!e.target.closest('.share-btn')) navigate('#/ditado/' + card.dataset.id); });
      });
    }
    render();
    if (search) search.addEventListener('input', (e) => render(e.target.value));
  }

  // ─── SINGLE ───
  function renderSingle(id) {
    const container = document.getElementById('single-content');
    if (!container) return;
    const saying = sayings.find(s => s.id === parseInt(id));
    if (!saying) { container.innerHTML = '<p style="text-align:center;padding:4rem;">Ditado não encontrado.</p>'; return; }
    currentSayingId = saying.id;
    container.innerHTML = `
      <div class="single-saying-inner">
        ${saying.image ? `<img class="saying-image" src="img/${saying.image}" alt="" loading="lazy">` : ''}
        <blockquote>${esc(saying.text)}</blockquote>
        ${saying.context ? `<p class="context">${esc(saying.context)}</p>` : ''}
        <p class="meta">${saying.author ? `Ouvido por ${esc(saying.author)} &middot; ` : ''}${fmtDate(saying.date)}</p>
        <div class="single-saying-nav">
          <button class="btn" onclick="window.sabedoria.prev()">&#8592; Anterior</button>
          <button class="btn btn-filled" onclick="window.sabedoria.random()">Aleatório</button>
          <button class="btn" onclick="window.sabedoria.next()">Próximo &#8594;</button>
        </div>
      </div>`;
  }

  // ─── FORM ───
  function setupForm() {
    const form = document.getElementById('saying-form');
    const msg  = document.getElementById('form-message');
    if (!form || !msg) return;

    // Clear any message left from a previous visit
    msg.className = 'form-message';
    msg.style.display = 'none';

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';

    form.onsubmit = async (e) => {
      e.preventDefault();
      const text     = document.getElementById('field-text').value.trim();
      const context  = document.getElementById('field-context').value.trim();
      const author   = document.getElementById('field-author').value.trim() || null;
      const password = document.getElementById('field-password').value;

      if (!text) { showMsg(msg, 'error', 'O ditado é obrigatório!'); return; }
      if (!CONFIG.apiEndpoint) { showMsg(msg, 'error', 'API não configurada.'); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }
      showMsg(msg, 'info', 'Enviando sugestão...');

      try {
        const res = await fetch(CONFIG.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, author, context: context || null, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { showMsg(msg, 'error', 'Senha incorreta.'); return; }
        if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
        showMsg(msg, 'success', 'Ditado enviado! Um Pull Request foi aberto para revisão. ✓');
        form.reset();
      } catch (err) {
        showMsg(msg, 'error', 'Erro ao enviar: ' + err.message);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
      }
    };
  }

  function showMsg(el, type, html) {
    el.className = 'form-message ' + type;
    el.innerHTML = html;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function shareSaying(id) {
    const s = sayings.find(x => x.id === parseInt(id));
    if (!s) return;
    const url = window.location.origin + window.location.pathname + '#/ditado/' + id;
    if (navigator.share) { navigator.share({ title: CONFIG.siteName, text: s.text, url }); }
    else { navigator.clipboard.writeText(`"${s.text}" — ${CONFIG.grandmaName}\n${url}`); }
  }

  function prevSaying() {
    if (!currentSayingId) return;
    const i = sayings.findIndex(s => s.id === currentSayingId);
    navigate('#/ditado/' + (i > 0 ? sayings[i-1] : sayings[sayings.length-1]).id);
  }
  function nextSaying() {
    if (!currentSayingId) return;
    const i = sayings.findIndex(s => s.id === currentSayingId);
    navigate('#/ditado/' + (i < sayings.length-1 ? sayings[i+1] : sayings[0]).id);
  }
  function randomSaying() {
    const r = sayings[Math.floor(Math.random() * sayings.length)];
    if (r) navigate('#/ditado/' + r.id);
  }

  function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function fmtDate(ds) {
    if (!ds) return '';
    try { return new Date(ds+'T00:00:00').toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' }); }
    catch { return ds; }
  }

  window.sabedoria = { share: shareSaying, prev: prevSaying, next: nextSaying, random: randomSaying };

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1 });
    const mo = new MutationObserver((muts) => muts.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('saying-card')) obs.observe(n); })));
    document.addEventListener('DOMContentLoaded', () => { const l = document.getElementById('sayings-list'); if (l) mo.observe(l, { childList: true }); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
