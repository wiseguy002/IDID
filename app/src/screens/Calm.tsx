import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '../db';
import { useApp } from '../state';
import { CalmCanvas, type CalmMode } from '../components/CalmCanvas';
import { Segmented } from '../components/ui';
import { Icon } from '../components/Icon';

const MODES: { value: CalmMode; label: string; hint: string }[] = [
  { value: 'ripples', label: 'Ripples', hint: 'Tap anywhere, like rain on still water.' },
  { value: 'trails', label: 'Light trails', hint: 'Trace slowly with your finger. Watch the light fade.' },
  { value: 'drift', label: 'Drifting', hint: 'Watch the lights float by. Touch to nudge them gently.' },
];
const TIMES = [{ value: '0', label: 'No timer' }, { value: '60', label: '1 min' }, { value: '180', label: '3 min' }, { value: '300', label: '5 min' }];

/** A quiet sensory space for a minute or two of decompressing. Not a game: no score, no sound. */
export default function Calm() {
  const { me, settings, go, toast } = useApp();
  const [mode, setMode] = useState<CalmMode>('ripples');
  const [secs, setSecs] = useState('0');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [asking, setAsking] = useState(false);
  const info = MODES.find((m) => m.value === mode)!;

  const counted = useRef(false);
  useEffect(() => {
    setStartedAt(Date.now());
    if (!counted.current) { counted.current = true; track(me?.id, 'calm'); } // once per visit, even if React re-runs effects
  }, []); // eslint-disable-line
  useEffect(() => {
    const total = Number(secs);
    if (!total) { setLeft(null); return; }
    const end = Date.now() + total * 1000;
    setLeft(total);
    const iv = setInterval(() => {
      const l = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) { clearInterval(iv); setAsking(true); }
    }, 1000);
    return () => clearInterval(iv);
  }, [secs]);
  const onTouch = useCallback(() => setTouched(true), []);

  const finish = () => { if (startedAt && Date.now() - startedAt > 15000) setAsking(true); else go({ name: 'pause' }); };
  const answer = (helped: 'yes' | 'bit' | 'no') => {
    track(me?.id, 'calm-answered');
    if (helped !== 'no') track(me?.id, 'calm-helped');
    toast(helped === 'no' ? 'Thanks for trying. Be gentle with yourself; something else might help today.' : "I'm glad. Come back any time.");
    go({ name: 'pause' });
  };
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fade-in">
      <div className="row between" style={{ flexWrap: 'nowrap', marginBottom: '.6rem' }}>
        <div>
          <h1 style={{ marginBottom: 0 }}>Calm space</h1>
          <p className="muted small" style={{ margin: 0 }}>Nothing to do and nothing to win. Just a moment for you.</p>
        </div>
        <button className="btn sm" onClick={finish}><Icon name="check" size={16} /> Done</button>
      </div>
      <Segmented label="Calm mode" value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m.value, label: m.label }))} />
      <div style={{ position: 'relative', height: 'max(280px, min(calc(100dvh - 330px), 620px))', marginTop: '.7rem', border: '1px solid var(--line)', borderRadius: 22, overflow: 'hidden' }}>
        <CalmCanvas key={mode} mode={mode} calmMotion={settings.reduceMotion} onTouch={onTouch} />
        <p className="muted" aria-live="polite" style={{ position: 'absolute', left: 0, right: 0, bottom: 14, textAlign: 'center', margin: 0, pointerEvents: 'none', opacity: touched ? 0 : 1, transition: 'opacity 2s ease' }}>
          {mode === 'drift' && settings.reduceMotion ? 'Calm motion is on, so the lights glow softly in place.' : info.hint}
        </p>
        {left != null && <span className="tag" style={{ position: 'absolute', top: 12, right: 12 }} aria-label={`${left} seconds left`}>{mm(left)}</span>}
      </div>
      <div className="row between" style={{ marginTop: '.7rem' }}>
        <span className="small muted">Timer</span>
        <div style={{ flex: 1, maxWidth: 360 }}><Segmented label="Timer" value={secs} onChange={setSecs} options={TIMES} /></div>
      </div>

      {asking && (
        <div className="overlay" onClick={() => go({ name: 'pause' })}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Welcome back" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2>Welcome back.</h2>
            <p className="muted">Did that help, even a little?</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary" onClick={() => answer('yes')}>Yes</button>
              <button className="btn" onClick={() => answer('bit')}>A little</button>
              <button className="btn" onClick={() => answer('no')}>Not really</button>
            </div>
            <button className="btn ghost sm" style={{ marginTop: '.6rem' }} onClick={() => setAsking(false)}>Stay a bit longer</button>
          </div>
        </div>
      )}
    </div>
  );
}
