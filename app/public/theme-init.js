// Choose the dark theme before first paint on dark-mode devices (kept external for the Content Security Policy).
if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dusk';
