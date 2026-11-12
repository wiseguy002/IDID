import { useMemo, useState } from 'react';
import { store, uid, useAll, useOne } from '../db';
import { useApp } from '../state';
import { adherence, blankDay, bodyId, dateKey, sleepInsight } from '../lib/body';
import type { BodyDay, Medication } from '../types';
import { ChipSelect, PageHead, Segmented, Sheet, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const SLEEP = [3, 4, 5, 6, 7, 8, 9, 10];

function MedForm({ m, onClose }: { m: Medication; onClose: () => void }) {
  const { toast } = useApp();
  const [x, setX] = useState(m);
  const isNew = !store.get('meds', m.id);
  return (
    <Sheet title={isNew ? 'Add a medication' : x.name} onClose={onClose}>
      <div className="grid2">
        <label className="field"><span>Name</span><input id="med-name" className="input" value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} autoFocus /></label>
        <label className="field"><span>Dose</span><input id="med-dose" className="input" value={x.dose} onChange={(e) => setX({ ...x, dose: e.target.value })} placeholder="e.g. 50 mg" /></label>
      </div>
      <div className="eyebrow">Times to take it</div>
      <div className="stack">
        {x.times.map((t, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <input aria-label={`Time ${i + 1}`} className="input" type="time" value={t} style={{ maxWidth: 160 }} onChange={(e) => e.target.value && setX({ ...x, times: x.times.map((y, j) => (j === i ? e.target.value : y)).sort() })} />
            <button className="iconbtn" aria-label="Remove time" onClick={() => setX({ ...x, times: x.times.filter((_, j) => j !== i) })}><Icon name="close" size={18} /></button>
          </div>
        ))}
      </div>
      <button className="btn sm" style={{ marginTop: '.5rem' }} onClick={() => setX({ ...x, times: [...x.times, '09:00'].sort() })}><Icon name="plus" size={15} /> Add a time</button>
      {x.times.length === 0 && <p className="tiny muted">No times means "as needed".</p>}
      <Switch label="Remind me" hint="A notification that just says it's time, never the medication's name" checked={x.remind} onChange={(v) => setX({ ...x, remind: v })} />
      <label className="field"><span>Notes</span><input className="input" value={x.notes} onChange={(e) => setX({ ...x, notes: e.target.value })} placeholder="With food, prescribed by…" /></label>
      <div className="row">
        <button className="btn primary" disabled={!x.name.trim()} onClick={async () => { await store.put('meds', { ...x, name: x.name.trim() }); toast('Saved.'); onClose(); }}>Save</button>
        {!isNew && <button className="btn ghost" onClick={async () => { await store.patch('meds', m.id, { active: !m.active }); onClose(); }}>{m.active ? 'Stopped taking it' : 'Taking it again'}</button>}
        {!isNew && <button className="btn ghost danger" onClick={async () => { await store.remove('meds', m.id); onClose(); }}>Delete</button>}
      </div>
      <p className="tiny muted">iDID doesn't give medical advice. Talk to your prescriber before changing how you take any medication.</p>
    </Sheet>
  );
}

export default function Body() {
  const { me, members, go, toast } = useApp();
  const tracked = members.filter((m) => m.tracked);
  const whoId = me?.tracked ? me.id : tracked[0]?.id ?? me?.id ?? '';
  const [offset, setOffset] = useState(0);
  const date = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - offset); return dateKey(d); }, [offset]);
  const saved = useOne('body', bodyId(whoId, date));
  const day: BodyDay = saved ?? blankDay(whoId, date);
  const meds = useAll('meds').filter((m) => m.memberId === whoId);
  const active = meds.filter((m) => m.active);
  const days = useAll('body').filter((d) => d.memberId === whoId);
  const entries = useAll('entries').filter((e) => e.subjectId === whoId);
  const [editMed, setEditMed] = useState<Medication | null>(null);
  const set = (p: Partial<BodyDay>) => store.put('body', { ...day, ...p });
  const insight = sleepInsight(days, entries);
  const ad = adherence(saved, meds);
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); const k = dateKey(d); return { k, label: d.toLocaleDateString(undefined, { weekday: 'short' }), day: days.find((x) => x.date === k) }; });

  return (
    <div className="fade-in">
      <PageHead title="Body basics" sub="Sleep, food, water and medication all affect how present we feel." onBack={() => go({ name: 'home' })} />
      <div className="row between" style={{ marginBottom: '.6rem' }}>
        <button className="iconbtn" aria-label="Previous day" onClick={() => setOffset(offset + 1)}><Icon name="back" /></button>
        <b>{offset === 0 ? 'Today' : offset === 1 ? 'Yesterday' : new Date(date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</b>
        <button className="iconbtn" aria-label="Next day" disabled={offset === 0} style={{ transform: 'scaleX(-1)', opacity: offset === 0 ? 0.3 : 1 }} onClick={() => setOffset(Math.max(0, offset - 1))}><Icon name="back" /></button>
      </div>

      <div className="card">
        <h3>Sleep last night</h3>
        <div className="chips">{SLEEP.map((h) => <button key={h} className="chip" aria-pressed={day.sleepHours === h} onClick={() => set({ sleepHours: day.sleepHours === h ? null : h })}>{h === 3 ? '3 or less' : h === 10 ? '10+' : h} h</button>)}</div>
        <div className="eyebrow" style={{ marginTop: '.8rem' }}>How rested do you feel?</div>
        <Segmented label="Sleep quality" value={String(day.sleepQuality ?? '')} onChange={(v) => set({ sleepQuality: v ? Number(v) : null })}
          options={[{ value: '1', label: 'Exhausted' }, { value: '2', label: 'Tired' }, { value: '3', label: 'Okay' }, { value: '4', label: 'Rested' }]} />
      </div>
      <div className="card">
        <h3>Food & water</h3>
        <ChipSelect value={day.meals} onChange={(v) => set({ meals: v })} options={MEALS.map((m) => ({ value: m, label: m }))} />
        <div className="row" style={{ marginTop: '.8rem' }}>
          <span>Glasses of water</span>
          <button className="btn sm" aria-label="One less glass" onClick={() => set({ water: Math.max(0, day.water - 1) })}>−</button>
          <b style={{ minWidth: '2ch', textAlign: 'center' }} aria-live="polite">{day.water}</b>
          <button className="btn sm" aria-label="One more glass" onClick={() => set({ water: day.water + 1 })}>+</button>
        </div>
      </div>
      <div className="card">
        <div className="row between"><h3 style={{ margin: 0 }}>Medication</h3><button className="btn sm" onClick={() => setEditMed({ id: uid(), memberId: whoId, name: '', dose: '', times: ['08:00'], remind: true, notes: '', active: true, createdAt: Date.now() })}><Icon name="plus" size={15} /> Add</button></div>
        {active.length === 0 && <p className="small muted" style={{ margin: '.5rem 0 0' }}>Add medications to tick them off each day and get gentle reminders.</p>}
        {active.map((m) => (
          <div key={m.id} style={{ padding: '.55rem 0', borderBottom: '1px solid var(--line)' }}>
            <div className="row between" style={{ flexWrap: 'nowrap' }}><span><b>{m.name}</b> <span className="small muted">{m.dose}</span></span><button className="iconbtn" aria-label={`Edit ${m.name}`} onClick={() => setEditMed(m)}><Icon name="edit" size={17} /></button></div>
            <div className="chips">
              {m.times.map((t) => { const k = `${m.id}@${t}`; return <button key={k} className="chip" aria-pressed={!!day.medsTaken[k]} onClick={() => { const mt = { ...day.medsTaken }; if (mt[k]) delete mt[k]; else mt[k] = Date.now(); set({ medsTaken: mt }); }}>{t}</button>; })}
              {m.times.length === 0 && <button className="chip" onClick={() => { const n = Object.keys(day.medsTaken).filter((k) => k.startsWith(`${m.id}@prn`)).length; set({ medsTaken: { ...day.medsTaken, [`${m.id}@prn${n + 1}`]: Date.now() } }); toast('Noted.'); }}>Took a dose ({Object.keys(day.medsTaken).filter((k) => k.startsWith(`${m.id}@prn`)).length} today)</button>}
            </div>
          </div>
        ))}
        {ad.due > 0 && <p className="tiny muted" style={{ margin: '.5rem 0 0' }}>{ad.taken} of {ad.due} doses ticked off.</p>}
        {meds.some((m) => !m.active) && <details style={{ marginTop: '.5rem' }}><summary className="small muted">Stopped ({meds.filter((m) => !m.active).length})</summary>{meds.filter((m) => !m.active).map((m) => <button key={m.id} className="btn ghost sm" onClick={() => setEditMed(m)}>{m.name}</button>)}</details>}
      </div>
      <div className="card">
        <Switch label="Moved my body" hint="A walk, a stretch, dancing in the kitchen" checked={day.movement} onChange={(v) => set({ movement: v })} />
        <Switch label="Got outside or saw daylight" checked={day.outside} onChange={(v) => set({ outside: v })} />
        <label className="field" style={{ marginBottom: 0 }}><span className="small">Notes</span><input id="body-notes" className="input" value={day.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Headache, appetite, anything else" /></label>
      </div>

      <div className="card">
        <h3>This week</h3>
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem', fontVariantNumeric: 'tabular-nums' }}>
            <thead><tr>{['', 'Sleep', 'Meals', 'Water', 'Meds'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '.3rem' }}>{h}</th>)}</tr></thead>
            <tbody>{week.map((r) => { const a = adherence(r.day, meds, r.k); return (
              <tr key={r.k} style={{ borderTop: '1px solid var(--line)' }}><td style={{ padding: '.35rem .3rem' }}>{r.label}</td><td>{r.day?.sleepHours != null ? `${r.day.sleepHours}h` : '—'}</td><td>{r.day ? r.day.meals.length : '—'}</td><td>{r.day ? r.day.water : '—'}</td><td>{a.due ? `${a.taken}/${a.due}` : '—'}</td></tr>
            ); })}</tbody>
          </table>
        </div>
        {insight && <p className="small" style={{ margin: '.7rem 0 0' }}>On nights with <b>under 6 hours</b> of sleep, you noted <b>{insight.short.toFixed(1)}</b> moments a day on average, compared with <b>{insight.rested.toFixed(1)}</b> after <b>7 hours or more</b>. Worth mentioning to your care team.</p>}
      </div>
      {editMed && <MedForm m={editMed} onClose={() => setEditMed(null)} />}
    </div>
  );
}
