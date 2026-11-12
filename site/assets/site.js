// Small progressive enhancements. Everything works without JavaScript.
(() => {
  const btn = document.querySelector('.menu-btn');
  const nav = document.querySelector('nav.main');
  const setMenu = (open) => { if (!btn || !nav) return; nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Close' : 'Menu'; };
  if (btn && nav) {
    btn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); btn.focus(); } });
  }
  // Links to other sites open in a new tab, without telling them where the visitor came from.
  document.querySelectorAll('a[href^="http"]').forEach((a) => {
    if (new URL(a.href).hostname.endsWith('idid.care')) return;
    a.target = '_blank'; a.rel = 'noopener noreferrer';
  });

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
      navigator.share({ title: 'iDID', text: src ? (src.value ?? src.textContent) : '', url: 'https://idid.care' }).catch(() => {});
    });
  });
  // 404: a gentle, slightly silly "plan B" generator.
  const planB = document.getElementById('plan-b');
  const next = document.getElementById('plan-b-next');
  if (planB && next) {
    const plans = [
      'Take one slow breath. The page will wait.',
      'Make a cup of tea. Lost pages love a tea break.',
      'Stretch your arms up high. Ta-da, you did a thing.',
      'Look out of a window and find one cloud. Name it Kevin.',
      'Be as patient with yourself as you are with this page.',
      'Wiggle your toes. Grounding, but make it fun.',
      'Drink a glass of water. Your body says thanks.',
      'Text someone you like a single emoji. Mystery is good.',
      'Go back home and start fresh. Fresh starts count.',
      'Notice one thing that went right today. Even a small one.',
    ];
    let i = 0;
    next.addEventListener('click', () => { i = (i + 1) % plans.length; planB.textContent = plans[i]; });
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  const y = document.getElementById('year'); if (y) y.textContent = String(new Date().getFullYear());
})();
