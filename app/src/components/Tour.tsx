import { useState } from 'react';
import { track } from '../db';
import { useApp } from '../state';
import type { Route } from '../state';
import { partWords } from '../lib/util';
import { Sheet } from './ui';
import { Icon } from './Icon';

interface Step { icon: string; title: string; body: string; show?: Route; showLabel?: string }

/** A short, skippable tour. Plain cards (no spotlights or motion) to stay sensory-friendly. */
export function Tour({ onClose }: { onClose: () => void }) {
  const { go, me, settings } = useApp();
  const w = partWords(settings.partWord);
  const steps: Step[] = [
    { icon: 'leaf', title: 'Welcome to iDID', body: 'A quiet, private place to notice what happens, find what helps, and stay connected to people you trust. This takes about a minute, and you can stop at any time.' },
    { icon: 'plus', title: 'Note a moment', body: `When something feels different, tap Log. Every step is optional: when and where, possible triggers, how you feel, which ${w.many} were present, and who noticed. One word is enough.`, show: { name: 'log' }, showLabel: 'Try logging' },
    { icon: 'compass', title: 'Who’s here, and what you missed', body: `Who’s here notes which ${w.many} are around in two taps, and shows notes left for them on the inner board. After lost time, What did I miss? starts with today’s date and gathers what happened in iDID while you were away. Voice notes are there for when typing is too much.`, show: { name: 'missed' }, showLabel: 'What did I miss?' },
    { icon: 'heart', title: 'Pause when it’s a lot', body: 'Pause (top of every screen) has breathing, box breathing, grounding, a wordless Calm space, your safety plan, your comfort kit, and \"Check on me\" to quietly ask someone to reach out. The eye icon hides iDID instantly if someone walks in.', show: { name: 'pause' }, showLabel: 'Open Pause' },
    { icon: 'chart', title: 'See patterns', body: 'Over time, Patterns shows what tends to come before hard moments, where and when they happen, who notices, and which ideas actually help. You can give your therapist a private, read-only view of exactly what you choose.', show: { name: 'insights' }, showLabel: 'See Patterns' },
    { icon: 'people', title: 'Your circle', body: 'Add people you trust. If someone noticed something, they can be asked to add what they saw. With the online circle, everyone uses their own phone: invite people, see when they’ve joined, and choose what each person can see. Everything is end-to-end encrypted.', show: { name: 'circle' }, showLabel: 'Open Circle' },
    { icon: 'bell', title: 'Support & appointments', body: 'Find support near you (specialists, low-cost care, crisis lines and community), keep important contacts handy, get reminders for therapy and groups, and prepare for sessions.', show: { name: 'support' }, showLabel: 'Find support' },
    { icon: 'sparkle', title: 'Explore, garden & kindness', body: 'Explore shows everything iDID can do and the badges you collect along the way. Your Mood Garden grows a plant for each part from the care you give, and nothing ever wilts. You can also send an anonymous kind note or try a small act of kindness. Help & guides explains everything step by step whenever you need it.', show: { name: 'explore' }, showLabel: 'Open Explore' },
  ];
  const [i, setI] = useState(0);
  const s = steps[i];
  const finish = (r?: Route) => { track(me?.id, 'tour'); onClose(); if (r) go(r); };
  return (
    <Sheet title={`Quick tour · ${i + 1} of ${steps.length}`} onClose={() => finish()}>
      <div className="steps" aria-hidden="true">{steps.map((_, k) => <i key={k} className={k <= i ? 'on' : ''} />)}</div>
      <div style={{ textAlign: 'center', padding: '.6rem 0 0' }} key={i} className="fade-in">
        <div className="brand-mark" style={{ width: 64, height: 64, margin: '0 auto .8rem' }}><Icon name={s.icon} size={30} /></div>
        <h2>{s.title}</h2>
        <p style={{ maxWidth: '34rem', margin: '0 auto 1rem' }}>{s.body}</p>
        {s.show && <button className="btn sm" onClick={() => finish(s.show)}>{s.showLabel} <Icon name="back" size={14} /></button>}
      </div>
      <div className="row" style={{ marginTop: '1.2rem' }}>
        {i > 0 ? <button className="btn" style={{ flex: 1 }} onClick={() => setI(i - 1)}>Back</button> : <button className="btn ghost" style={{ flex: 1 }} onClick={() => finish()}>Skip tour</button>}
        {i < steps.length - 1 ? <button className="btn primary" style={{ flex: 1 }} onClick={() => setI(i + 1)}>Next</button> : <button className="btn primary" style={{ flex: 1 }} onClick={() => finish()}>Done</button>}
      </div>
    </Sheet>
  );
}
