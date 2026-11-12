// Small progressive enhancements. Everything works without JavaScript.
(() => {
  const btn = document.querySelector('.menu-btn');
  const nav = document.querySelector('nav.main');
  if (btn && nav) btn.addEventListener('click', () => { const o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); });

  const toast = (m) => {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
  };
  document.querySelectorAll('[data-copy]').forEach((el) => el.addEventListener('click', async () => {
    const src = document.getElementById(el.getAttribute('data-copy'));
    const text = src ? (src.value ?? src.textContent) : el.getAttribute('data-text');
    try { await navigator.clipboard.writeText(text); toast('Copied. Paste it anywhere.'); }
    catch { if (src && src.select) { src.focus(); src.select(); } toast('Select the text and copy it.'); }
  }));
  document.querySelectorAll('[data-share]').forEach((el) => {
    if (!navigator.share) { el.hidden = true; return; }
    el.addEventListener('click', () => {
      const src = document.getElementById(el.getAttribute('data-share'));
      navigator.share({ title: 'IDID', text: src ? (src.value ?? src.textContent) : '', url: 'https://idid.care' }).catch(() => {});
    });
  });
  const y = document.getElementById('year'); if (y) y.textContent = String(new Date().getFullYear());
})();
