import { useState } from 'react';
import { db, uid, updateSettings } from '../db';
import { PALETTE } from '../lib/defaults';
import { partWords } from '../lib/util';
import type { Member, PartWord, ThemeName, TextSize } from '../types';
import { Segmented, Switch } from '../components/ui';
import { Icon } from '../components/Icon';
import { loadSample } from '../lib/sample';

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'self' | 'support'>('self');
  const [myName, setMyName] = useState('');
  const [theirName, setTheirName] = useState('');
  const [circleName, setCircleName] = useState('');
  const [partWord, setPartWord] = useState<PartWord>('parts');
  const [partNames, setPartNames] = useState<string[]>([]);
  const [partText, setPartText] = useState('');
  const [theme, setTheme] = useState<ThemeName>(matchMedia('(prefers-color-scheme: dark)').matches ? 'dusk' : 'morning');
  const [textSize, setTextSize] = useState<TextSize>('medium');
  const [reduceMotion, setReduceMotion] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const w = partWords(partWord);

  const preview = (t: ThemeName, s: TextSize, rm: boolean) => {
    const h = document.documentElement;
    h.dataset.theme = t; h.dataset.text = s; h.dataset.motion = rm ? 'reduce' : 'full';
  };

  const finish = async () => {
    const now = Date.now();
    const me = { id: uid(), name: myName.trim() || 'Me', role: 'self' as const, tracked: mode === 'self', canView: true, canObserve: true, color: PALETTE[0], createdAt: now };
    const members: Member[] = [me];
    let subjectId = me.id;
    if (mode === 'support' && theirName.trim()) {
      const them = { id: uid(), name: theirName.trim(), role: 'family' as const, tracked: true, canView: true, canObserve: true, color: PALETTE[1], createdAt: now + 1 };
      members.push(them);
      subjectId = them.id;
    }
    await db.members.bulkPut(members);
    await db.parts.bulkPut(partNames.map((n, i) => ({ id: uid(), memberId: subjectId, name: n, color: PALETTE[(i + 2) % PALETTE.length], createdAt: now + i })));
    onDone();
    await updateSettings({ onboarded: true, circleName: circleName.trim(), partWord, theme, textSize, reduceMotion, activeMemberId: me.id, lastOpenedAt: null });
  };

  const addPart = () => {
    const t = partText.trim();
    if (t && !partNames.includes(t)) setPartNames([...partNames, t]);
    setPartText('');
  };

  const steps = [
    <div key="0" className="stack">
      <div className="brand-mark" style={{ width: 64, height: 64 }}><Icon name="leaf" size={32} /></div>
      <h1>A quiet place to notice</h1>
      <p>IDID helps you gently record moments that felt different — when and where they happened, what may have set them off, how you felt, and who was around — so that over time, patterns become easier to see and share.</p>
      <div className="card accent">
        <h3>Your information stays with you</h3>
        <p className="small" style={{ margin: 0 }}>Everything is stored only on this device. Nothing is sent anywhere unless you choose to export or share it. You can add a passcode later in Settings.</p>
      </div>
      <p className="muted small">IDID is a journaling tool, not a medical device or a replacement for professional care.</p>
      <button className="btn ghost sm" onClick={loadSample}>Just looking? Explore with a sample circle</button>
    </div>,
    <div key="1" className="stack">
      <h1>Who is this for?</h1>
      <Segmented label="Who is this for" value={mode} onChange={setMode}
        options={[{ value: 'self', label: 'Myself' }, { value: 'support', label: 'Someone I support' }]} />
      <label className="field"><span>What would you like to be called?</span>
        <input className="input" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="A name or nickname" autoFocus /></label>
      {mode === 'support' && (
        <label className="field"><span>Who are you supporting?</span>
          <input className="input" value={theirName} onChange={(e) => setTheirName(e.target.value)} placeholder="Their name or nickname" /></label>
      )}
      <label className="field"><span>Name this space <span className="muted small">(optional)</span></span>
        <input className="input" value={circleName} onChange={(e) => setCircleName(e.target.value)} placeholder="e.g. Our circle, The Harbour" /></label>
      <p className="muted small">You can invite family, friends or a therapist into your trust circle later.</p>
    </div>,
    <div key="2" className="stack">
      <h1>Your words</h1>
      <p>Different people use different words. Which feels right?</p>
      <Segmented label="Word for parts" value={partWord} onChange={setPartWord}
        options={[{ value: 'parts', label: 'Parts' }, { value: 'alters', label: 'Alters' }, { value: 'headmates', label: 'Headmates' }, { value: 'selves', label: 'Selves' }]} />
      <div className="card soft">
        <h3>Add any {w.many} you know about</h3>
        <p className="small muted">Optional — you can skip this, add more later, or add {w.many} as you discover them.</p>
        <form className="row" onSubmit={(e) => { e.preventDefault(); addPart(); }}>
          <input className="input" style={{ flex: 1 }} value={partText} onChange={(e) => setPartText(e.target.value)} placeholder={`${w.One} name`} />
          <button className="btn primary" type="submit">Add</button>
        </form>
        <div className="chips" style={{ marginTop: '.7rem' }}>
          {partNames.map((n) => (
            <button key={n} className="chip" aria-pressed="true" onClick={() => setPartNames(partNames.filter((x) => x !== n))} aria-label={`Remove ${n}`}>{n} <Icon name="close" size={14} /></button>
          ))}
        </div>
      </div>
    </div>,
    <div key="3" className="stack">
      <h1>Make it comfortable</h1>
      <p>Choose what feels easiest on your eyes and mind. You can change this anytime.</p>
      <div className="eyebrow">Colours</div>
      <Segmented label="Theme" value={theme} onChange={(t) => { setTheme(t); preview(t, textSize, reduceMotion); }}
        options={[{ value: 'morning', label: 'Morning' }, { value: 'meadow', label: 'Meadow' }, { value: 'dusk', label: 'Dusk' }, { value: 'clear', label: 'High contrast' }]} />
      <div className="eyebrow">Text size</div>
      <Segmented label="Text size" value={textSize} onChange={(s) => { setTextSize(s); preview(theme, s, reduceMotion); }}
        options={[{ value: 'small', label: 'A' }, { value: 'medium', label: 'A+' }, { value: 'large', label: 'A++' }, { value: 'xlarge', label: 'A+++' }]} />
      <Switch label="Calm motion" hint="Turns off animations and movement" checked={reduceMotion} onChange={(v) => { setReduceMotion(v); preview(theme, textSize, v); }} />
    </div>,
  ];

  const canNext = step !== 1 || (myName.trim() && (mode === 'self' || theirName.trim()));

  return (
    <div className="app">
      <main style={{ paddingTop: '2rem' }}>
        <div className="steps" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        <div className="fade-in" key={step}>{steps[step]}</div>
      </main>
      <div className="wizard-foot"><div>
        {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        {step < steps.length - 1
          ? <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === 0 ? 'Begin' : 'Continue'}</button>
          : <button className="btn primary" onClick={finish}>I'm ready</button>}
      </div></div>
    </div>
  );
}
