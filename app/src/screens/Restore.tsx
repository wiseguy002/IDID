import { useState } from 'react';
import { restoreOnNewDevice, sendCode, verifyCode } from '../sync/account';
import { Switch } from '../components/ui';
import { Icon } from '../components/Icon';
import Captcha from '../components/Captcha';
import { captchaEnabled } from '../lib/captcha';

type Step = 'email' | 'code' | 'passphrase' | 'working' | 'recovery' | 'no-circle';

/** "I already use iDID": sign in on a new device and bring a journal back from the online circle. */
export default function Restore({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState('');
  const [ctoken, setCtoken] = useState('');
  const [ckey, setCkey] = useState(0);
  const [entries, setEntries] = useState(0);
  const [saved, setSaved] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); } finally { setBusy(false); }
  };

  const restore = () => run(async () => {
    setStep('working');
    try {
      const r = await restoreOnNewDevice(pass);
      if (r.result === 'ok') { setRecovery(r.recoveryCode); setEntries(r.entries); setStep('recovery'); return; }
      if (r.result === 'no-circle') { setStep('no-circle'); return; }
      setStep('passphrase');
      setError(r.result === 'wrong-passphrase'
        ? "That passphrase doesn't match your account. Use the passphrase you unlock iDID with on your other device."
        : "This email doesn't have an iDID account with a circle yet. Set up iDID as new instead.");
    } catch (e) { setStep('passphrase'); throw e; }
  });

  return (
    <div className="app">
      <main style={{ paddingTop: '2rem' }}>
        <div className="fade-in stack" key={step}>
          <div className="brand-mark" style={{ width: 64, height: 64 }}><Icon name="leaf" size={32} /></div>

          {step === 'email' && <>
            <h1>Welcome back</h1>
            <p>Sign in to bring your journal to this device. You'll need the email you use with your circle and your journal passphrase.</p>
            <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { try { await sendCode(email.trim(), true, ctoken); setStep('code'); } finally { setCtoken(''); setCkey((k) => k + 1); } }); }}>
              <label className="field"><span>Email</span>
                <input id="rs-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              <Captcha onToken={setCtoken} resetKey={ckey} />
              <p className="small muted">By signing in you confirm you're 13 or older and agree to the <a href="https://idid.care/terms" target="_blank" rel="noopener noreferrer">terms</a> and <a href="https://idid.care/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.</p>
              <button className="btn primary" disabled={busy || !email.includes('@') || (captchaEnabled() && !ctoken)}>{busy ? 'Sending…' : captchaEnabled() && !ctoken ? 'One moment…' : 'Email me a code'}</button>
            </form>
          </>}

          {step === 'code' && <>
            <h1>Check your email</h1>
            <p>We sent a 6-digit code to <b>{email.trim()}</b>. It can take a minute to arrive, and it may land in spam the first time.</p>
            <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await verifyCode(email.trim(), code); setStep('passphrase'); }); }}>
              <label className="field"><span>Code from the email</span>
                <input id="rs-code" className="input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="123456" /></label>
              <div className="row">
                <button className="btn primary" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Continue'}</button>
                <button type="button" className="btn ghost sm" onClick={() => { setCode(''); setStep('email'); }}>Use a different email</button>
              </div>
            </form>
          </>}

          {step === 'passphrase' && <>
            <h1>Your journal passphrase</h1>
            <p>Enter the passphrase you unlock iDID with on your other device. It opens your encrypted journal, and this device will use the same one.</p>
            <form className="stack" onSubmit={(e) => { e.preventDefault(); restore(); }}>
              <label className="field"><span>Passphrase</span>
                <input id="rs-pass" className="input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
              <button className="btn primary" disabled={busy || !pass}>Bring my journal here</button>
            </form>
            <p className="small muted">Forgot it? Unlock iDID on your other device with your recovery code, choose a new passphrase in Settings, then use that one here.</p>
          </>}

          {step === 'working' && <>
            <h1>Bringing your journal over…</h1>
            <p>Unlocking your account and gathering your entries. This usually takes a few seconds.</p>
            <div className="breath-wrap" style={{ height: 160 }}><div className="breath" /></div>
          </>}

          {step === 'recovery' && <>
            <h1>You're back</h1>
            <p>{entries > 0 ? `Your journal is here, with ${entries} ${entries === 1 ? 'entry' : 'entries'}.` : 'Your journal is here.'} Anything you add on either device keeps in sync.</p>
            <div className="card warm small">This device has its own recovery code. If you ever forget your passphrase here, it's the way back in. Keep it somewhere safe and private.</div>
            <div className="card" style={{ textAlign: 'center', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '1.15rem', letterSpacing: '.06em', userSelect: 'all' }} aria-label="Recovery code">{recovery.split('-').map((g, i, a) => <span key={i} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>{g}{i < a.length - 1 ? '-' : ''}</span>)}</div>
            <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(recovery).catch(() => undefined); }}>Copy code</button>
            <Switch label="I've saved this device's recovery code" checked={saved} onChange={setSaved} />
          </>}

          {step === 'no-circle' && <>
            <h1>Nothing to bring over yet</h1>
            <p>Your account is signed in, but your journal hasn't been shared to a circle, so it's only stored on your other device.</p>
            <div className="card small">
              <p style={{ marginTop: 0 }}>Two ways to move it:</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>On your other device, open <b>Circle → Connect devices & invite</b> and choose <b>Create our circle</b>. Then come back here.</li>
                <li>Or use <b>Settings → Export & backup</b> there, and import the backup on this device after setting it up.</li>
              </ul>
            </div>
          </>}

          {error && <p role="alert" className="small" style={{ color: 'var(--warm-text)' }}>{error}</p>}
        </div>
      </main>
      <div className="wizard-foot"><div>
        {['email', 'code', 'passphrase', 'no-circle'].includes(step) && <button className="btn" onClick={onBack} disabled={busy}>Set up as new instead</button>}
        {step === 'recovery' && <button className="btn primary" disabled={!saved} onClick={onDone}>Open my journal</button>}
      </div></div>
    </div>
  );
}
