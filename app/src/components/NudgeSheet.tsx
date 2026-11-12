import { useEffect, useMemo, useState } from 'react';
import { store, uid } from '../db';
import { useApp } from '../state';
import { ASK, FEELINGS, goodReply, opener, outsideIdea, positiveLine, ritualIdea } from '../lib/nudges';
import type { CheckIn, CheckInFeeling, IdeaKind } from '../types';
import { Sheet } from './ui';
import { Icon } from './Icon';

/** Three slow guided breaths. Text-only when calm motion is on. */
function MiniBreath({ onDone }: { onDone: () => void }) {
  const { settings } = useApp();
  const PHASES = [{ t: 'Breathe in', s: 4 }, { t: 'Hold', s: 1 }, { t: 'Breathe out', s: 5 }];
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(PHASES[0].s);
  const breath = Math.floor(i / 3) + 1;
  useEffect(() => {
    if (i >= 9) { onDone(); return; }
    const iv = setTimeout(() => {
      if (left > 1) setLeft(left - 1);
      else { const n = i + 1; setI(n); setLeft(PHASES[n % 3]?.s ?? 0); }
    }, 1000);
    return () => clearTimeout(iv);
  }, [i, left]); // eslint-disable-line
  const ph = PHASES[i % 3];
  const scale = ph.t === 'Breathe in' ? 1.35 : ph.t === 'Hold' ? 1.35 : 0.85;
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }} aria-live="polite">
      {!settings.reduceMotion && (
        <div style={{ height: 130, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-soft)', border: '2px solid var(--accent)', transform: `scale(${scale})`, transition: `transform ${ph.s}s ease-in-out` }} />
        </div>
      )}
      <h2 style={{ margin: '.3rem 0' }}>{i < 9 ? ph.t : 'Well done'}</h2>
      <p className="muted small">{i < 9 ? `${left} · breath ${breath} of 3` : ''}</p>
    </div>
  );
}

export function NudgeSheet({ onClose, onSnooze }: { onClose: () => void; onSnooze?: () => void }) {
  const { me, go, toast } = useApp();
  const seed = useMemo(() => Math.random(), []);
  const [rec, setRec] = useState<CheckIn | null>(null);
  const [trying, setTrying] = useState<IdeaKind | null>(null);
  const [ritual, setRitual] = useState(() => ritualIdea(me?.rituals, seed));
  const [asked, setAsked] = useState(false);
  const outside = outsideIdea();
  const pinned = store.all('contacts').filter((c) => c.pinned && c.memberId === me?.id);

  const answer = async (feeling: CheckInFeeling) => {
    const r: CheckIn = { id: uid(), memberId: me?.id ?? '', at: Date.now(), feeling, tried: null, helped: null };
    setRec(r);
    await store.put('checkins', r);
  };
  const tryIdea = async (k: IdeaKind) => {
    setTrying(k);
    if (rec) { const r = { ...rec, tried: k, ritual: k === 'ritual' ? ritual : undefined }; setRec(r); await store.put('checkins', r); }
  };
  const helped = async (v: boolean) => {
    if (rec) await store.put('checkins', { ...rec, helped: v });
    toast(v ? "I'm glad. I'll remember that this helps." : "Thanks for telling me. Be gentle with yourself; it's okay to try something else.");
    onClose();
  };
  const leave = (r: Parameters<typeof go>[0]) => { onClose(); go(r); };

  const Idea = ({ k, icon, title, body }: { k: IdeaKind; icon: string; title: string; body: string }) => (
    <button className="card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.8rem', margin: '0 0 .6rem' }} onClick={() => tryIdea(k)}>
      <span style={{ color: 'var(--accent)', paddingTop: 2 }}><Icon name={icon} size={22} /></span>
      <span><b>{title}</b><br /><span className="small muted">{body}</span></span>
    </button>
  );

  return (
    <Sheet title={rec ? 'A gentle check-in' : opener(seed)} onClose={onClose}>
      {!rec && (
        <>
          <h2 style={{ fontWeight: 500 }}>{ASK}</h2>
          <div className="stack">
            {FEELINGS.map((f) => <button key={f.value} className="btn block" onClick={() => answer(f.value)}>{f.label}</button>)}
          </div>
          <div className="row" style={{ marginTop: '.9rem', justifyContent: 'center' }}>
            {onSnooze && <button className="btn ghost sm" onClick={onSnooze}>Ask me a bit later</button>}
            <button className="btn ghost sm" onClick={() => leave({ name: 'settings' })}>Fewer check-ins</button>
          </div>
        </>
      )}

      {rec && !trying && (
        <>
          <div className="card accent"><p style={{ margin: 0 }}>{rec.feeling === 'good' ? goodReply(seed) : positiveLine(seed)}</p></div>
          {rec.feeling === 'struggling' && (
            <div className="card warm small">
              Thank you for being honest. You don't have to handle this alone.
              <div className="row" style={{ marginTop: '.6rem' }}>
                <button className="btn sm primary" onClick={() => leave({ name: 'pause' })}>Grounding tools</button>
                <button className="btn sm" onClick={() => leave({ name: 'support' })}>Reach out</button>
                <button className="btn sm" onClick={() => leave({ name: 'log' })}>Note what's happening</button>
              </div>
              {pinned[0]?.phone && <a className="btn sm" style={{ marginTop: '.5rem' }} href={`tel:${pinned[0].phone.replace(/[^\d+]/g, '')}`}>Call {pinned[0].name}</a>}
              <p className="tiny" style={{ margin: '.5rem 0 0' }}>In crisis? Call or text <b>988</b> any time.</p>
            </div>
          )}
          <div className="eyebrow" style={{ marginTop: '.4rem' }}>{rec.feeling === 'good' ? 'Keep it going' : 'Something small to try'}</div>
          <Idea k="breathe" icon="leaf" title="Breathe" body="Three slow breaths together, in for 4 and out for 5." />
          <Idea k="ritual" icon="sparkle" title="Interrupt the pattern" body={`${ritual}.`} />
          <Idea k="outside" icon="heart" title={outside.title} body={outside.body} />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button className="btn ghost sm" onClick={() => setRitual(ritualIdea(me?.rituals))}>Another ritual idea</button>
            <button className="btn ghost sm" onClick={() => { toast('Thanks for checking in.'); onClose(); }}>I'm okay for now</button>
          </div>
        </>
      )}

      {rec && trying && !asked && (
        <>
          {trying === 'breathe' ? <MiniBreath onDone={() => setAsked(true)} /> : (
            <div className="card soft" style={{ textAlign: 'center', padding: '1.4rem 1rem' }}>
              <h2>{trying === 'outside' ? outside.title : 'Your ritual'}</h2>
              <p>{trying === 'outside' ? outside.body : `${ritual}.`}</p>
              <p className="small muted">Take your time. I'll be here when you're back.</p>
              <button className="btn primary" onClick={() => setAsked(true)}>I'm back</button>
            </div>
          )}
          {trying === 'breathe' && <div style={{ textAlign: 'center' }}><button className="btn ghost sm" onClick={() => setAsked(true)}>Skip ahead</button></div>}
        </>
      )}

      {rec && trying && asked && (
        <>
          <h2 style={{ fontWeight: 500 }}>Did that help, even a little?</h2>
          <div className="row">
            <button className="btn primary" onClick={() => helped(true)}>Yes, it helped</button>
            <button className="btn" onClick={() => helped(false)}>Not really</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
