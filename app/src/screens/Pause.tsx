import { useEffect, useState } from 'react';
import { useApp } from '../state';
import { track, useAll } from '../db';
import { ContactRow, CrisisCard } from './Support';
import { Icon } from '../components/Icon';
import { PageHead, Segmented } from '../components/ui';

const GROUNDING = [
  { n: 5, sense: 'things you can see', hint: 'Look slowly around. Name colours, shapes, light.' },
  { n: 4, sense: 'things you can feel', hint: 'Your feet on the floor. Fabric. The air on your skin.' },
  { n: 3, sense: 'things you can hear', hint: 'Near and far. Your own breath counts.' },
  { n: 2, sense: 'things you can smell', hint: 'Or two smells you like, remembered.' },
  { n: 1, sense: 'thing you can taste', hint: 'Or one kind thing you could say to yourself.' },
];

export default function Pause() {
  const { go, settings, me, checkIn } = useApp();
  useEffect(() => { track(me?.id, 'pause'); }, [me?.id]);
  const pinned = useAll('contacts').filter((c) => c.pinned && (c.memberId === me?.id || !me?.tracked));
  const [mode, setMode] = useState<'breathe' | 'ground' | 'orient'>('breathe');
  const [g, setG] = useState(0);
  const now = new Date();
  return (
    <div className="fade-in">
      <PageHead title="Pause" sub="Nothing to log. Just a moment for you." onBack={() => go({ name: 'home' })} />
      <Segmented label="Tool" value={mode} onChange={setMode} options={[{ value: 'breathe', label: 'Breathe' }, { value: 'ground', label: '5-4-3-2-1' }, { value: 'orient', label: 'Right now' }]} />
      {mode === 'breathe' && (
        <div className="card soft" style={{ marginTop: '1rem', textAlign: 'center' }}>
          {settings.reduceMotion ? (
            <div style={{ padding: '2rem 0' }}><p style={{ fontSize: '1.2rem' }}>Breathe in for 4… hold for 1… out for 5.</p><p className="muted">Repeat as many times as you like.</p></div>
          ) : (
            <><div className="breath-wrap"><div className="breath" /></div>
              <p className="muted">Breathe in as the circle grows, out as it softens.</p></>
          )}
        </div>
      )}
      {mode === 'ground' && (
        <div className="card soft" style={{ marginTop: '1rem', textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', fontWeight: 650, color: 'var(--accent)' }}>{GROUNDING[g].n}</div>
          <h2>Notice {GROUNDING[g].n} {GROUNDING[g].sense}</h2>
          <p className="muted">{GROUNDING[g].hint}</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            {g > 0 && <button className="btn" onClick={() => setG(g - 1)}>Back</button>}
            {g < GROUNDING.length - 1 ? <button className="btn primary" onClick={() => setG(g + 1)}>Next</button> : <button className="btn primary" onClick={() => setG(0)}>Start again</button>}
          </div>
        </div>
      )}
      {mode === 'orient' && (
        <div className="card soft" style={{ marginTop: '1rem', padding: '1.6rem 1.2rem' }}>
          <p style={{ fontSize: '1.15rem' }}>Today is <b>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>.</p>
          <p style={{ fontSize: '1.15rem' }}>It is about <b>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</b>.</p>
          <p style={{ fontSize: '1.15rem' }}>{me?.name ? <>This body is in the present, with {me.name}. </> : null}Whatever happened before is not happening now.</p>
          <p className="muted" style={{ margin: 0 }}>Look around for one thing that tells you it's {now.getFullYear()}.</p>
        </div>
      )}
      <button className="btn block" style={{ marginTop: '1rem' }} onClick={checkIn}><Icon name="sparkle" size={18} /> Check in with yourself</button>
      <h2 style={{ marginTop: '1.4rem' }}>Reach out</h2>
      {pinned.length > 0 && <div className="card">{pinned.map((c) => <ContactRow key={c.id} c={c} />)}</div>}
      <CrisisCard />
      <button className="btn sm" onClick={() => go({ name: 'support' })}>More support options</button>
    </div>
  );
}
