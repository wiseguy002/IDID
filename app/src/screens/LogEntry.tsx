import { useEffect, useMemo, useState } from 'react';
import { saveEntry, store, uid, updateSettings } from '../db';
import { useApp } from '../state';
import { DEFAULT_FEELINGS, DEFAULT_LOCATIONS, DEFAULT_TRIGGERS, MOODS, PALETTE } from '../lib/defaults';
import { partWords, toLocalInput } from '../lib/util';
import { DURATIONS, type Entry } from '../types';
import { ChipSelect, Segmented, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

function blank(subjectId: string, authorId: string): Entry {
  const now = Date.now();
  return {
    id: uid(), subjectId, authorId, occurredAt: now, loggedAt: now, updatedAt: now, timeApprox: false,
    location: '', triggers: [], mood: null, feelings: [], frontingPartIds: [], frontingUnknown: false,
    coFronting: false, coFrontPartIds: [], lostTime: false, possibleCause: '', duration: null,
    noticedByIds: [], noticedByOthers: '', intensity: null, notes: '', visibility: 'circle', followUps: [],
  };
}

const STEP_TITLES = ['When & where', 'What might have set it off', 'How it feels', 'Who was present inside', 'Who noticed'];

export default function LogEntry({ entryId }: { entryId?: string }) {
  const { me, members, parts, settings, go, toast } = useApp();
  const tracked = members.filter((m) => m.tracked);
  const defaultSubject = me?.tracked ? me.id : tracked[0]?.id ?? me?.id ?? '';
  const [e, setE] = useState<Entry>(() => blank(defaultSubject, me?.id ?? ''));
  const [step, setStep] = useState(0);
  const [when, setWhen] = useState<'now' | 'earlier'>('now');
  const [ask, setAsk] = useState(true);
  const [loaded, setLoaded] = useState(!entryId);
  const w = partWords(settings.partWord);

  useEffect(() => {
    if (!entryId) return;
    const x = store.get('entries', entryId);
    if (x) { setE(x); setWhen('earlier'); }
    setLoaded(true);
  }, [entryId]);

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setE((p) => ({ ...p, [k]: v }));
  const subject = members.find((m) => m.id === e.subjectId);
  const isSelf = e.subjectId === me?.id;
  const subjParts = useMemo(() => parts.filter((p) => p.memberId === e.subjectId && !p.archived), [parts, e.subjectId]);
  const partOpts = subjParts.map((p) => ({ value: p.id, label: p.name, color: p.color }));
  const noticers = members.filter((m) => m.id !== e.subjectId);

  const opts = (base: string[], custom: string[]) => [...new Set([...base, ...custom])].map((x) => ({ value: x, label: x }));

  const addCustom = (key: 'customTriggers' | 'customLocations' | 'customFeelings', field: 'triggers' | 'feelings' | 'location', v: string) => {
    if (!settings[key].includes(v)) updateSettings({ [key]: [...settings[key], v] });
    if (field === 'location') set('location', v);
    else set(field, [...e[field], v]);
  };

  const addPart = async (name: string, field: 'frontingPartIds' | 'coFrontPartIds') => {
    const p = { id: uid(), memberId: e.subjectId, name, color: PALETTE[(subjParts.length + 2) % PALETTE.length], createdAt: Date.now() };
    await store.put('parts', p);
    set(field, [...e[field], p.id]);
  };

  const save = async () => {
    const entry = { ...e, updatedAt: Date.now(), occurredAt: when === 'now' && !entryId ? Date.now() : e.occurredAt };
    const asked = (await saveEntry(entry, { requestObservations: ask })).length;
    toast(asked ? `Saved. We'll gently ask ${asked === 1 ? 'them' : `${asked} people`} to add a note.` : 'Saved. Thank you for noticing.');
    go({ name: 'entry', id: entry.id });
  };

  if (!loaded) return null;
  const you = isSelf ? 'you' : subject?.name ?? 'they';
  const your = isSelf ? 'your' : `${subject?.name ?? 'their'}'s`;

  const body = [
    <div key="0" className="stack">
      {(tracked.length > 1 || !me?.tracked) && tracked.length > 0 && (
        <div>
          <div className="eyebrow">This is about</div>
          <ChipSelect multi={false} value={[e.subjectId]} onChange={(v) => v[0] && setE((p) => ({ ...p, subjectId: v[0], frontingPartIds: [], coFrontPartIds: [] }))}
            options={tracked.map((m) => ({ value: m.id, label: m.id === me?.id ? `Me (${m.name})` : m.name, color: m.color }))} />
        </div>
      )}
      <div>
        <div className="eyebrow">When did it happen?</div>
        <Segmented label="When" value={when} onChange={setWhen} options={[{ value: 'now', label: 'Just now' }, { value: 'earlier', label: 'Earlier' }]} />
        {when === 'earlier' && (
          <div style={{ marginTop: '.6rem' }}>
            <input type="datetime-local" className="input" value={toLocalInput(e.occurredAt)} max={toLocalInput(Date.now())}
              onChange={(ev) => ev.target.value && set('occurredAt', new Date(ev.target.value).getTime())} aria-label="Date and time" />
            <Switch label="This is a best guess" hint="Time can be hard to hold onto — that's okay." checked={e.timeApprox} onChange={(v) => set('timeApprox', v)} />
          </div>
        )}
      </div>
      <div>
        <div className="eyebrow">Where {isSelf ? 'were you' : `was ${you}`}?</div>
        <ChipSelect multi={false} value={e.location ? [e.location] : []} onChange={(v) => set('location', v[0] ?? '')}
          options={opts(DEFAULT_LOCATIONS, settings.customLocations)} onAdd={(v) => addCustom('customLocations', 'location', v)} addLabel="Somewhere else" />
      </div>
    </div>,
    <div key="1" className="stack">
      <div>
        <div className="eyebrow">Possible triggers</div>
        <p className="small muted">Choose any that might fit. It's fine not to know.</p>
        <ChipSelect value={e.triggers} onChange={(v) => set('triggers', v)} options={opts(DEFAULT_TRIGGERS, settings.customTriggers)} onAdd={(v) => addCustom('customTriggers', 'triggers', v)} />
      </div>
      <label className="field"><span>What do you think might have caused it?</span>
        <textarea className="input" value={e.possibleCause} onChange={(ev) => set('possibleCause', ev.target.value)} placeholder="A thought, a guess, a detail — or leave blank" /></label>
    </div>,
    <div key="2" className="stack">
      <div>
        <div className="eyebrow">How {isSelf ? 'are you' : `is ${you}`} feeling?</div>
        <div className="moods" role="group" aria-label="Mood">
          {MOODS.map((m) => (
            <button key={m.value} type="button" className="mood" aria-pressed={e.mood === m.value} onClick={() => set('mood', e.mood === m.value ? null : m.value)}>
              <span className={`orb m${m.value}`} />{m.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="eyebrow">Words that fit</div>
        <ChipSelect value={e.feelings} onChange={(v) => set('feelings', v)} options={opts(DEFAULT_FEELINGS, settings.customFeelings)} onAdd={(v) => addCustom('customFeelings', 'feelings', v)} />
      </div>
      <div>
        <div className="eyebrow">How strong was it?</div>
        <Segmented label="Intensity" value={String(e.intensity ?? '')} onChange={(v) => set('intensity', v ? Number(v) : null)}
          options={[{ value: '1', label: 'Mild' }, { value: '2', label: 'Moderate' }, { value: '3', label: 'Strong' }, { value: '4', label: 'Very strong' }]} />
      </div>
    </div>,
    <div key="3" className="stack">
      <div>
        <div className="eyebrow">Who was fronting or in control?</div>
        <ChipSelect value={e.frontingPartIds} onChange={(v) => set('frontingPartIds', v)} options={partOpts} onAdd={(n) => addPart(n, 'frontingPartIds')} addLabel={`New ${w.one}`} />
        <div className="chips" style={{ marginTop: '.45rem' }}>
          <button type="button" className="chip" aria-pressed={e.frontingUnknown} onClick={() => set('frontingUnknown', !e.frontingUnknown)}>Not sure / someone unknown</button>
        </div>
      </div>
      <Switch label="Co-fronting" hint={`More than one ${w.one} present or sharing awareness`} checked={e.coFronting} onChange={(v) => set('coFronting', v)} />
      {e.coFronting && (
        <div>
          <div className="eyebrow">Sharing front with</div>
          <ChipSelect value={e.coFrontPartIds} onChange={(v) => set('coFrontPartIds', v)} options={partOpts.filter((p) => !e.frontingPartIds.includes(p.value))} onAdd={(n) => addPart(n, 'coFrontPartIds')} addLabel={`New ${w.one}`} />
        </div>
      )}
      <Switch label="Lost time or memory gaps" hint="Parts of this are hazy or missing" checked={e.lostTime} onChange={(v) => set('lostTime', v)} />
      <div>
        <div className="eyebrow">How long might it have been happening?</div>
        <ChipSelect multi={false} value={e.duration ? [e.duration] : []} onChange={(v) => set('duration', (v[0] as Entry['duration']) ?? null)} options={DURATIONS} />
      </div>
    </div>,
    <div key="4" className="stack">
      <div>
        <div className="eyebrow">Do you think anyone noticed?</div>
        {noticers.length > 0 ? (
          <ChipSelect value={e.noticedByIds} onChange={(v) => set('noticedByIds', v)} options={noticers.map((m) => ({ value: m.id, label: m.id === me?.id ? `Me (${m.name})` : m.name, color: m.color }))} />
        ) : <p className="small muted">No one else is in your circle yet. You can add trusted people from the Circle tab.</p>}
        <label className="field" style={{ marginTop: '.7rem' }}><span className="small">Anyone else? <span className="muted">(not in your circle)</span></span>
          <input className="input" value={e.noticedByOthers} onChange={(ev) => set('noticedByOthers', ev.target.value)} placeholder="e.g. a teacher, coworker" /></label>
        {e.noticedByIds.some((id) => id !== me?.id) && e.visibility === 'circle' && (
          <Switch label="Ask them to add what they noticed" hint="They'll see a gentle request next time they open IDID." checked={ask} onChange={setAsk} />
        )}
      </div>
      <label className="field"><span>Anything else to remember?</span>
        <textarea className="input" value={e.notes} onChange={(ev) => set('notes', ev.target.value)} placeholder="Whatever feels important — in your own words." /></label>
      <div>
        <div className="eyebrow">Who can see this</div>
        <Segmented label="Visibility" value={e.visibility} onChange={(v) => set('visibility', v)}
          options={[{ value: 'circle', label: 'My trust circle' }, { value: 'private', label: isSelf ? 'Only me' : `Only me & ${subject?.name}` }]} />
      </div>
    </div>,
  ];

  return (
    <div>
      <div className="row between" style={{ flexWrap: 'nowrap' }}>
        <div>
          <div className="eyebrow">{entryId ? 'Editing' : 'New moment'} · {step + 1} of {body.length}</div>
          <h1>{STEP_TITLES[step]}</h1>
        </div>
        <button className="iconbtn" aria-label="Cancel" onClick={() => go(entryId ? { name: 'entry', id: entryId } : { name: 'home' })}><Icon name="close" /></button>
      </div>
      <div className="steps" aria-hidden="true">{body.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
      {!isSelf && step === 0 && <p className="small muted">You're noting this on {your} behalf. Write what you saw — they can add their own view later.</p>}
      <div className="fade-in" key={step}>{body[step]}</div>
      <div style={{ height: '5rem' }} />
      <div className="wizard-foot"><div>
        {step > 0 ? <button className="btn" onClick={() => setStep(step - 1)}>Back</button> : <button className="btn" onClick={save}>Save now</button>}
        {step < body.length - 1
          ? <button className="btn primary" onClick={() => setStep(step + 1)}>Next</button>
          : <button className="btn primary" onClick={save}><Icon name="check" size={18} /> Save</button>}
      </div></div>
    </div>
  );
}
