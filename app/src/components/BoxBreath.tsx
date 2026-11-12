import { useEffect, useRef, useState } from 'react';

/** Box breathing: in 4, hold 4, out 4, hold 4. Each full square adds a box to the group being built. */
export const SIDE_SECONDS = 4;
const BOX_SECONDS = SIDE_SECONDS * 4;
export const SIDES = [
  { label: 'Breathe in', hint: 'along the top' },
  { label: 'Hold', hint: 'down the side' },
  { label: 'Breathe out', hint: 'along the bottom' },
  { label: 'Hold', hint: 'back up' },
] as const;

/** Where the breath is after `seconds`: which box, which side, how far along it, and the countdown. */
export function boxPhase(seconds: number) {
  const s = Math.max(0, seconds);
  const box = Math.floor(s / BOX_SECONDS);
  const inBox = s - box * BOX_SECONDS;
  const side = Math.min(3, Math.floor(inBox / SIDE_SECONDS));
  const along = (inBox - side * SIDE_SECONDS) / SIDE_SECONDS;
  return { box, side, along, count: Math.max(1, SIDE_SECONDS - Math.floor(inBox - side * SIDE_SECONDS)) };
}

const GOALS = [
  { value: 4, label: '4 boxes', about: 'about a minute' },
  { value: 8, label: '8 boxes', about: 'about two minutes' },
  { value: 0, label: 'Keep going', about: 'no goal' },
];
const CHEERS = ['A first box. Nicely done.', 'Two, side by side.', 'Three. Steady and slow.', 'Four. A little foundation.', 'Five boxes and counting.', 'Six. Look at that.', 'Seven. Still here, still breathing.', 'Eight. A sturdy little group.'];
const TINTS = ['var(--accent-soft)', 'var(--warm-soft)', 'var(--accent-2-soft)'];

// The square, in a 200×200 viewBox: corners clockwise from top-left.
const P = [[30, 30], [170, 30], [170, 170], [30, 170]] as const;
const at = (side: number, t: number) => {
  const [x1, y1] = P[side]; const [x2, y2] = P[(side + 1) % 4];
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
};

export default function BoxBreath({ reduceMotion, onBox }: { reduceMotion: boolean; onBox: (total: number) => void }) {
  const [goal, setGoal] = useState(4);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds of breathing so far this session
  const base = useRef(0); // elapsed when the current run started
  const startedAt = useRef(0);
  const counted = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now();
    let raf = 0; let timer = 0;
    const tick = () => setElapsed(base.current + (performance.now() - startedAt.current) / 1000);
    if (reduceMotion) timer = window.setInterval(tick, 250);
    else { const loop = () => { tick(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
    return () => { cancelAnimationFrame(raf); clearInterval(timer); base.current += (performance.now() - startedAt.current) / 1000; };
  }, [running, reduceMotion]);

  const ph = boxPhase(elapsed);
  const built = ph.box;
  const done = goal > 0 && built >= goal;

  useEffect(() => {
    if (built > counted.current) { counted.current = built; onBox(built); }
    if (done) setRunning(false);
  }, [built, done, onBox]);

  const reset = () => { setRunning(false); base.current = 0; counted.current = 0; setElapsed(0); };
  const started = elapsed > 0;
  const idle = !running && !started;

  // Path traced so far in the current box, and the moving light.
  const showSide = done ? 3 : ph.side;
  const showAlong = done ? 1 : reduceMotion ? 1 : ph.along;
  const pts = [P[0], ...P.slice(1, showSide + 1), at(showSide, showAlong)];
  const [dx, dy] = at(showSide, showAlong);
  const label = idle ? 'Ready?' : done ? 'All built' : SIDES[ph.side].label;

  return (
    <div>
      {idle && (
        <div className="segmented" role="group" aria-label="How many boxes" style={{ marginBottom: '.6rem' }}>
          {GOALS.map((g) => <button key={g.value} type="button" aria-pressed={goal === g.value} onClick={() => setGoal(g.value)}>{g.label}</button>)}
        </div>
      )}
      <div className="box-breath">
        <svg viewBox="0 0 200 200" role="img" aria-label={`Box breathing: ${label}`}>
          <rect x="30" y="30" width="140" height="140" rx="6" className="bb-track" />
          {started && <polyline points={pts.map((p) => p.join(',')).join(' ')} className="bb-trace" />}
          {started && !done && <circle cx={dx} cy={dy} r="9" className="bb-light" />}
          <text x="100" y="94" textAnchor="middle" className="bb-phase">{label}</text>
          {running && !done && <text x="100" y="132" textAnchor="middle" className="bb-count">{ph.count}</text>}
          {idle && <text x="100" y="122" textAnchor="middle" className="bb-hint">4 in · 4 hold · 4 out · 4 hold</text>}
        </svg>
      </div>
      <p className="visually-hidden" aria-live="polite">{running ? label : ''}</p>
      <p className="muted" style={{ minHeight: '1.5em', margin: '.2rem 0 .8rem' }}>
        {done ? `You built ${built} ${built === 1 ? 'box' : 'boxes'}. That's ${Math.round((built * BOX_SECONDS) / 60) || 1} minute${built * BOX_SECONDS >= 90 ? 's' : ''} of steady breathing.`
          : built > 0 ? CHEERS[Math.min(built, CHEERS.length) - 1]
          : running ? `Follow the light ${SIDES[ph.side].hint}.`
          : idle ? `Trace a square with your breath. Each one adds a box (${GOALS.find((g) => g.value === goal)?.about}).` : 'Paused. Pick up whenever you like.'}
      </p>
      <div className="row" style={{ justifyContent: 'center' }}>
        {done ? (
          <><button className="btn primary" onClick={() => { setGoal(0); setRunning(true); }}>Keep going</button>
            <button className="btn" onClick={reset}>Start a new group</button></>
        ) : (
          <><button className="btn primary" onClick={() => setRunning(!running)}>{running ? 'Pause' : started ? 'Continue' : 'Start'}</button>
            {started && <button className="btn" onClick={reset}>Start over</button>}</>
        )}
      </div>
      {built > 0 && (
        <div className="bb-group" aria-label={`${built} ${built === 1 ? 'box' : 'boxes'} built`} role="img">
          {Array.from({ length: Math.min(built, 32) }, (_, i) => (
            <span key={i} className={`bb-box${reduceMotion ? '' : ' pop'}`} style={{ background: TINTS[Math.floor(i / 4) % TINTS.length] }} />
          ))}
          {built > 32 && <span className="small muted">+{built - 32}</span>}
        </div>
      )}
    </div>
  );
}
