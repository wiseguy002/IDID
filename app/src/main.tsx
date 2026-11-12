import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Keep an invite token for this tab, then clear it from the address bar.
if (location.hash.startsWith('#invite=')) {
  try { sessionStorage.setItem('idid.invite', location.hash.slice('#invite='.length)); } catch { /* ignore */ }
  history.replaceState(null, '', location.pathname + location.search);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_SINGLE_FILE) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
