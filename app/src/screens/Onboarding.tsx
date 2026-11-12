import { useState } from 'react';
import { persist, store, uid, updateDevice, updatePrefs } from '../db';
import { createVault, hasVault, passphraseStrength } from '../data/vault';
import { APP_VERSION } from '../version';
import { PALETTE } from '../lib/defaults';
import { partWords } from '../lib/util';
import type { Member, PartWord, SupportNeed, ThemeName, TextSize } from '../types';
import { SupportProfileEditor } from './Support';
import { isZip } from '../lib/resources';
import { Segmented, Switch } from '../components/ui';
import { Icon } from '../components/Icon';
import { loadSample, markSampleDevice, SAMPLE_PASSPHRASE, takeStartWithSignIn } from '../lib/sample';
import { cloudConfigured } from '../sync/supabase';
import Restore from './Restore';

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [returning, setReturning] = useState(() => takeStartWithSignIn() && cloudConfigured());
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
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [recovery, setRecovery] = useState<string | null>(null);
  const [savedCode, setSavedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zip, setZip] = useState('');
  const [needs, setNeeds] = useState<SupportNeed[]>([]);
  const strength = passphraseStrength(pass);

  /** Make sure an unlocked encrypted store exists. */
  const ensureVault = async (passphrase: string) => {
    if (store.unlocked) return null;
    if (await hasVault(persist)) throw new Error('vault exists');
    // A brand-new journal: nothing to catch up on (no old check-ins, no "updated" note).
    try { localStorage.setItem('idid.nudge.handled', String(Date.now())); } catch { /* ignore */ }
    updateDevice({ lastSeenVersion: APP_VERSION });
    const { dataKey, recoveryCode } = await createVault(persist, passphrase);
    await store.open(dataKey);
    return recoveryCode;
  };

  const sample = async () => {
    setBusy(true);
    await ensureVault(SAMPLE_PASSPHRASE);
    markSampleDevice(true);
    await loadSample();
    onDone();
  };
  const w = partWords(partWord);

  const preview = (t: ThemeName, s: TextSize, rm: boolean) => {
    const h = document.documentElement;
    h.dataset.theme = t; h.dataset.text = s; h.dataset.motion = rm ? 'reduce' : 'full';
  };

  const createSecure = async () => {
    setBusy(true);
    const code = await ensureVault(pass);
    setRecovery(code);
    setBusy(false);
    setStep(step + 1);
  };

  const finish = async () => {
    const now = Date.now();
    const me: Member = { id: uid(), name: myName.trim() || 'Me', role: 'self', tracked: mode === 'self', canView: true, canObserve: true, color: PALETTE[0], createdAt: now };
    const members: Member[] = [me];
    let subjectId = me.id;
    if (mode === 'support' && theirName.trim()) {
      const them = { id: uid(), name: theirName.trim(), role: 'family' as const, tracked: true, canView: true, canObserve: true, color: PALETTE[1], createdAt: now + 1 };
      members.push(them);
      subjectId = them.id;
    }
    updateDevice({ theme, textSize, reduceMotion, activeMemberId: me.id, lastOpenedAt: null });
    await updatePrefs({ circleName: circleName.trim(), partWord });
    await store.putMany('parts', partNames.map((n, i) => ({ id: uid(), memberId: subjectId, name: n, color: PALETTE[(i + 2) % PALETTE.length], createdAt: now + i })));
    if (isZip(zip) || needs.length) {
      const target = members.find((m) => m.id === subjectId) ?? me;
      target.support = { zip: isZip(zip) ? zip : '', needs };
    }
    await store.putMany('members', members);
    onDone();
  };

  const addPart = () => {
    const t = partText.trim();
    if (t && !partNames.includes(t)) setPartNames([...partNames, t]);
    setPartText('');
  };

  const steps = [
    <div key="0" className="stack">
      <div className="brand-mark" style={{ width: 64, height: 64 }}><Icon name="leaf" size={32} /></div>
      {(() => { try { return sessionStorage.getItem('idid.invite'); } catch { return null; } })() && <div className="card blue small">You've been invited to a trust circle. Set up iDID on this device first, then you'll join.</div>}
      <h1>A quiet place to notice</h1>
      <p>iDID helps you gently record moments that felt different — when and where they happened, what may have set them off, how you felt, and who was around — so that over time, patterns become easier to see and share.</p>
      <div className="card accent">
        <h3>Private by design</h3>
        <p className="small" style={{ margin: 0 }}>Everything you write is encrypted on this device with a passphrase only you know. If you later connect a trust circle, entries are encrypted before they leave your device, so even our server can't read them.</p>
      </div>
      <p className="muted small">iDID is a journaling tool, not a medical device or a replacement for professional care.</p>
      {cloudConfigured() && <button className="btn block" onClick={() => setReturning(true)} disabled={busy}><Icon name="people" size={18} /> I already use iDID</button>}
      <button className="btn ghost sm" onClick={sample} disabled={busy}>Just looking? Explore with a sample circle</button>
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
        <input className="input" value={circleName} onChange={(e) => setCircleName(e.target.value)} placeholder="e.g. Our circle, The Harbor" /></label>
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
      <div className="eyebrow">Colors</div>
      <Segmented label="Theme" value={theme} onChange={(t) => { setTheme(t); preview(t, textSize, reduceMotion); }}
        options={[{ value: 'morning', label: 'Morning' }, { value: 'meadow', label: 'Meadow' }, { value: 'dusk', label: 'Dusk' }, { value: 'clear', label: 'High contrast' }]} />
      <div className="eyebrow">Text size</div>
      <Segmented label="Text size" value={textSize} onChange={(s) => { setTextSize(s); preview(theme, s, reduceMotion); }}
        options={[{ value: 'small', label: 'A' }, { value: 'medium', label: 'A+' }, { value: 'large', label: 'A++' }, { value: 'xlarge', label: 'A+++' }]} />
      <Switch label="Calm motion" hint="Turns off animations and movement" checked={reduceMotion} onChange={(v) => { setReduceMotion(v); preview(theme, textSize, v); }} />
    </div>,
    <div key="4" className="stack">
      <h1>Choose a passphrase</h1>
      <p>Your passphrase locks and encrypts your journal. A few unrelated words are easy to remember and hard to guess, like <i>lantern otter maple tea</i>.</p>
      <label className="field"><span>Passphrase</span>
        <input id="ob-pass" className="input" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} disabled={!!recovery} /></label>
      <p className="small muted" style={{ marginTop: '-.5rem' }}>{pass && strength.hint}</p>
      <label className="field"><span>Type it again</span>
        <input id="ob-pass2" className="input" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} disabled={!!recovery} /></label>
      {pass2 && pass !== pass2 && <p className="small" style={{ color: 'var(--warm)' }}>These don't match yet.</p>}
      <div className="card warm small">No one, including us, can reset this passphrase. On the next screen you'll get a recovery code as a backup.</div>
    </div>,
    <div key="5" className="stack">
      <h1>Save your recovery code</h1>
      <p>If you ever forget your passphrase, this code is the only way back into your journal. Write it down or keep it in a password manager, somewhere safe and private.</p>
      <div className="card" style={{ textAlign: 'center', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '1.15rem', letterSpacing: '.06em', userSelect: 'all' }} aria-label="Recovery code">{recovery?.split('-').map((g, i) => <span key={i} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>{g}{i < 4 ? '-' : ''}</span>)}</div>
      <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(recovery ?? '').catch(() => undefined); }}>Copy code</button>
      <Switch label="I've saved my recovery code" checked={savedCode} onChange={setSavedCode} />
    </div>,
    <div key="6" className="stack">
      <h1>Support near {mode === 'support' && theirName.trim() ? theirName.trim() : 'you'}</h1>
      <p>Optional. With a ZIP code, iDID can point you to crisis services, trauma and dissociation specialists, low-cost care, and community nearby, matched to what would help.</p>
      <SupportProfileEditor zip={zip} needs={needs} onZip={setZip} onNeeds={setNeeds} />
      <p className="small muted">This stays encrypted in your journal. You can skip it and add it later from <b>Find support</b>.</p>
    </div>,
  ];

  const canNext = step === 1 ? !!(myName.trim() && (mode === 'self' || theirName.trim()))
    : step === 4 ? strength.ok && pass === pass2 && !busy
    : step === 5 ? savedCode
    : step === 6 ? !zip || isZip(zip) : true;

  if (returning) return <Restore onDone={onDone} onBack={() => setReturning(false)} />;

  return (
    <div className="app">
      <main style={{ paddingTop: '2rem' }}>
        <div className="steps" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        <div className="fade-in" key={step}>{steps[step]}</div>
      </main>
      <div className="wizard-foot"><div>
        {step > 0 && step < 5 && !recovery && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        {step === 4 && !recovery
          ? <button className="btn primary" disabled={!canNext} onClick={createSecure}>{busy ? 'Securing…' : 'Encrypt my journal'}</button>
          : step === 4 ? <button className="btn primary" onClick={() => setStep(5)}>Continue</button>
          : step < steps.length - 1
          ? <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === 0 ? 'Begin' : 'Continue'}</button>
          : <button className="btn primary" disabled={!canNext || busy} onClick={() => { setBusy(true); finish(); }}>{zip || needs.length ? "I'm ready" : "Skip for now — I'm ready"}</button>}
      </div></div>
    </div>
  );
}
