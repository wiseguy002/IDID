import { useEffect, useState } from 'react';

/** What shows after Quick hide: calm and ordinary, with nothing about iDID on screen. */
export function Cover({ style, onExit }: { style: 'calm' | 'notes'; onExit: () => void }) {
  const [now, setNow] = useState(() => new Date());
  const [taps, setTaps] = useState<number[]>([]);
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(iv); }, []);
  // Three quick taps anywhere (or the corner button) brings back the lock screen.
  const tap = () => {
    const t = Date.now();
    const recent = [...taps.filter((x) => t - x < 1200), t];
    setTaps(recent);
    if (recent.length >= 3) onExit();
  };
  if (style === 'notes') {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#222', fontFamily: 'system-ui, sans-serif', padding: 'max(16px, env(safe-area-inset-top)) 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
          <b style={{ fontSize: 20 }}>Notes</b>
          <button aria-label="Menu" onClick={onExit} style={{ background: 'none', border: 0, fontSize: 22, color: '#666', width: 44, height: 44 }}>≡</button>
        </div>
        <textarea aria-label="Note" defaultValue={`Shopping\n- milk\n- bread\n- apples\n`} style={{ width: '100%', minHeight: '70vh', border: 0, outline: 'none', fontSize: 17, lineHeight: 1.6, marginTop: 12, resize: 'none', fontFamily: 'inherit', color: '#222', background: 'transparent' }} />
      </div>
    );
  }
  return (
    <div onClick={tap} style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--muted)', display: 'grid', placeItems: 'center', userSelect: 'none' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3.2rem', fontWeight: 300, color: 'var(--ink)' }}>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
        <div>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>
    </div>
  );
}

/** Esc pressed twice quickly hides the app. */
export function useHideShortcut(onHide: () => void) {
  useEffect(() => {
    let last = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = Date.now();
      if (t - last < 800) onHide();
      last = t;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onHide]);
}
