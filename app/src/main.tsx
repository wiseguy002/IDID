import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import CareView from './screens/CareView';
import { parseCareToken } from './lib/careShare';
import { ErrorBoundary } from './components/ErrorBoundary';
import { APP_VERSION } from './version';
import { detectLang, setLang } from './i18n';
import { getDevice } from './db';

setLang(getDevice().lang ?? detectLang());

// Keep an invite token for this tab, then clear it from the address bar.
if (location.hash.startsWith('#invite=')) {
  try { sessionStorage.setItem('idid.invite', location.hash.slice('#invite='.length)); } catch { /* ignore */ }
  history.replaceState(null, '', location.pathname + location.search);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {parseCareToken(location.hash) ? <CareView /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_SINGLE_FILE) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(APP_VERSION)}`).catch(() => {}));
}
