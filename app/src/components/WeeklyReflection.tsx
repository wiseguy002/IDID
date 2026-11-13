import { useState } from 'react';
import { store, uid, useAll } from '../db';
import { useApp } from '../state';
import { fmtDate } from '../lib/util';
import { reflectionDue, weekSummary } from '../lib/reflection';
import { Icon } from './Icon';

/** On the weekend (if turned on in Settings), a gentle look back at the week. Never scored, always skippable. */
export function WeeklyReflection() {
  const { me, settings, toast } = useApp();
  const reflections = useAll('reflections');
  const entries = useAll('entries');
  const checkins = useAll('checkins');
  const fronts = useAll('fronts');
  const [helped, setHelped] = useState('');
  const [hard, setHard] = useState('');
  const [hope, setHope] = useState('');
  const [open, setOpen] = useState(false);
  if (!me) return null;
  const weekOf = reflectionDue(settings.weeklyReflection, reflections, me.id);
  if (weekOf == null) return null;
  const s = weekSummary(me.id, weekOf, { entries, checkins, fronts });

  const save = async (skip = false) => {
    await store.put('reflections', { id: uid(), memberId: me.id, weekOf, helped: skip ? '' : helped.trim(), hard: skip ? '' : hard.trim(), hope: skip ? '' : hope.trim(), createdAt: Date.now() });
    toast(skip ? 'Okay. See you next week.' : 'Saved to your private journal.');
  };

  return (
    <div className="card warm">
      <div className="eyebrow"><Icon name="sun" size={14} /> Looking back on the week of {fmtDate(weekOf)}</div>
      <p style={{ margin: '0 0 .4rem' }}>{s.line}</p>
      <p className="small muted" style={{ margin: '0 0 .6rem' }}>
        {s.entries} {s.entries === 1 ? 'moment' : 'moments'} noted · {s.checkins} check-in{s.checkins === 1 ? '' : 's'}{s.fronts ? ` · ${s.fronts} "who's here" notes` : ''}
      </p>
      {open ? <>
        <label className="field"><span>What helped, even a little?</span><textarea className="input" value={helped} onChange={(e) => setHelped(e.target.value)} maxLength={1000} /></label>
        <label className="field"><span>What was hard?</span><textarea className="input" value={hard} onChange={(e) => setHard(e.target.value)} maxLength={1000} /></label>
        <label className="field"><span>One small thing to try or hope for next week</span><textarea className="input" value={hope} onChange={(e) => setHope(e.target.value)} maxLength={1000} /></label>
        <div className="row"><button className="btn primary sm" onClick={() => save()}>Save</button><button className="btn ghost sm" onClick={() => setOpen(false)}>Not now</button></div>
      </> : (
        <div className="row">
          <button className="btn sm primary" onClick={() => setOpen(true)}>Reflect for a minute</button>
          <button className="btn sm ghost" onClick={() => save(true)}>Skip this week</button>
        </div>
      )}
    </div>
  );
}

/** Past reflections, for the Timeline or therapy prep. */
export function useReflections(memberId: string | undefined) {
  return useAll('reflections').filter((r) => r.memberId === memberId && (r.helped || r.hard || r.hope)).sort((a, b) => b.weekOf - a.weekOf);
}

/** Past reflections, shown on Patterns. */
export function PastReflections() {
  const { me } = useApp();
  const list = useReflections(me?.id);
  if (!list.length) return null;
  return (
    <div className="card">
      <div className="eyebrow"><Icon name="sun" size={14} /> Weekly reflections</div>
      {list.slice(0, 6).map((r) => (
        <div key={r.id} className="small" style={{ margin: '.5rem 0' }}>
          <b>Week of {fmtDate(r.weekOf)}</b>
          {r.helped && <div>Helped: {r.helped}</div>}
          {r.hard && <div>Hard: {r.hard}</div>}
          {r.hope && <div>Next week: {r.hope}</div>}
        </div>
      ))}
    </div>
  );
}
