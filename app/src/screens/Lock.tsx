import { useEffect, useState } from 'react';
import { persist, store, wipeAll } from '../db';
import { markSampleDevice, SAMPLE_PASSPHRASE, startWithSignIn } from '../lib/sample';
import { cloudConfigured } from '../sync/supabase';
import { changePassphrase, passphraseStrength, unlockVault, unlockWithRecovery } from '../data/vault';
import { Icon } from '../components/Icon';

export default function Lock({ onUnlock }: { onUnlock: () => void }) {
  const [mode, setMode] = useState<'pass' | 'recover' | 'reset' | 'replace'>('pass');
  const [sampleKey, setSampleKey] = useState<CryptoKey | null>(null);
  const [confirm, setConfirm] = useState('');
  // The sample circle uses a known passphrase, so recognize it and don't ask for one.
  useEffect(() => { unlockVault(persist, SAMPLE_PASSPHRASE).then((k) => { if (k) { markSampleDevice(true); setSampleKey(k); } }).catch(() => undefined); }, []);
  const erase = async (signIn: boolean) => { if (signIn) startWithSignIn(); await wipeAll(); };
  const online = cloudConfigured();
  const [value, setValue] = useState('');
  const [newPass, setNewPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [key, setKey] = useState<CryptoKey | null>(null);

  const submit = async () => {
    setBusy(true); setMsg('');
    if (mode === 'pass') {
      const k = await unlockVault(persist, value);
      if (k) { await store.open(k); onUnlock(); return; }
      setMsg("That passphrase didn't match. Take your time: capitals and spaces count. If your phone filled it in for you, try typing it yourself.");
    } else if (mode === 'recover') {
      const k = await unlockWithRecovery(persist, value);
      if (k) { setKey(k); setMode('reset'); setValue(''); }
      else setMsg("That recovery code didn't match. Check each group of letters.");
    } else if (key) {
      await changePassphrase(persist, key, newPass);
      await store.open(key); onUnlock(); return;
    }
    setBusy(false);
  };

  const strength = passphraseStrength(newPass);

  if (sampleKey) return (
    <div className="lock">
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div className="brand-mark" style={{ width: 56, height: 56, margin: '0 auto' }}><Icon name="leaf" size={26} /></div>
        <h2 style={{ marginTop: '1rem' }}>This device has the sample circle</h2>
        <p className="muted">Someone explored iDID here with made-up entries. It isn't a real journal, so no passphrase is needed.</p>
        <div className="stack" style={{ marginTop: '1rem' }}>
          {online && <button className="btn primary block" onClick={() => erase(true)}>I already use iDID: bring my journal here</button>}
          <button className={`btn block${online ? '' : ' primary'}`} onClick={() => erase(false)}>Set up my own journal</button>
          <button className="btn ghost sm" onClick={async () => { await store.open(sampleKey); onUnlock(); }}>Keep exploring the sample</button>
        </div>
        <p className="tiny muted" style={{ marginTop: '.8rem' }}>Leaving removes the sample from this device.</p>
      </div>
    </div>
  );

  if (mode === 'replace') return (
    <div className="lock">
      <form style={{ width: '100%', maxWidth: 400, textAlign: 'center' }} onSubmit={(e) => { e.preventDefault(); if (confirm.trim().toLowerCase() === 'erase') erase(online); }}>
        <div className="brand-mark" style={{ width: 56, height: 56, margin: '0 auto' }}><Icon name="lock" size={26} /></div>
        <h2 style={{ marginTop: '1rem' }}>Not your journal?</h2>
        <p className="muted" style={{ textAlign: 'left' }}>If this device has someone else's journal, or an old one you don't need, you can erase it{online ? ' and then sign in to bring your own journal here' : ' and start fresh'}.</p>
        <div className="card warm small" style={{ textAlign: 'left' }}>Erasing can't be undone. Anything in the journal on this device that was never connected to an online circle will be gone. If it might be yours, try your recovery code first.</div>
        <label className="field" style={{ textAlign: 'left', marginTop: '.8rem' }}><span>Type <b>erase</b> to confirm</span>
          <input id="erase-confirm" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="none" /></label>
        <button className="btn primary block" style={{ marginTop: '.9rem' }} type="submit" disabled={confirm.trim().toLowerCase() !== 'erase'}>{online ? 'Erase and sign in' : 'Erase and start fresh'}</button>
        <button type="button" className="btn ghost sm" style={{ marginTop: '.6rem' }} onClick={() => { setMode('pass'); setConfirm(''); }}>Back</button>
      </form>
    </div>
  );

  return (
    <div className="lock">
      <form style={{ width: '100%', maxWidth: 400, textAlign: 'center' }} onSubmit={(e) => { e.preventDefault(); if (!busy) submit(); }}>
        <div className="brand-mark" style={{ width: 56, height: 56, margin: '0 auto' }}><Icon name="lock" size={26} /></div>
        <h2 style={{ marginTop: '1rem' }}>{mode === 'reset' ? 'Choose a new passphrase' : 'Welcome back'}</h2>
        <p className="muted">{mode === 'pass' ? 'Your journal is locked and encrypted. Enter your passphrase to open it.' : mode === 'recover' ? 'Enter the recovery code you saved when you set up iDID.' : 'Your journal is open. Choose a passphrase you will remember.'}</p>
        {mode !== 'reset' ? (
          <input id="unlock-input" className="input" type={mode === 'pass' ? 'password' : 'text'} autoFocus autoComplete={mode === 'pass' ? 'current-password' : 'off'}
            value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === 'pass' ? 'Passphrase' : 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'} aria-label={mode === 'pass' ? 'Passphrase' : 'Recovery code'} />
        ) : (
          <>
            <input id="new-pass" className="input" type="password" autoFocus autoComplete="new-password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New passphrase" aria-label="New passphrase" />
            <p className="small muted" style={{ textAlign: 'left', marginTop: '.4rem' }}>{newPass && strength.hint}</p>
          </>
        )}
        {msg && <p className="small" style={{ color: 'var(--warm)', marginTop: '.6rem' }} role="alert">{msg}</p>}
        <button className="btn primary block" style={{ marginTop: '.9rem' }} type="submit" disabled={busy || (mode === 'reset' ? !strength.ok : !value)}>
          {busy ? 'Opening…' : mode === 'pass' ? 'Unlock' : mode === 'recover' ? 'Use recovery code' : 'Save and open'}
        </button>
        {mode === 'pass' && <button type="button" className="btn ghost sm" style={{ marginTop: '.6rem' }} onClick={() => { setMode('recover'); setValue(''); setMsg(''); }}>I forgot my passphrase</button>}
        {mode === 'pass' && <button type="button" className="btn ghost sm" onClick={() => { setMode('replace'); setMsg(''); }}>This isn't my journal</button>}
        {mode === 'recover' && <button type="button" className="btn ghost sm" style={{ marginTop: '.6rem' }} onClick={() => { setMode('pass'); setValue(''); setMsg(''); }}>Back to passphrase</button>}
      </form>
    </div>
  );
}
