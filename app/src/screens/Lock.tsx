import { useState } from 'react';
import { persist, store } from '../db';
import { changePassphrase, passphraseStrength, unlockVault, unlockWithRecovery } from '../data/vault';
import { Icon } from '../components/Icon';

export default function Lock({ onUnlock }: { onUnlock: () => void }) {
  const [mode, setMode] = useState<'pass' | 'recover' | 'reset'>('pass');
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
      setMsg("That passphrase didn't match. Take your time — capitals and spaces count.");
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
        {mode === 'recover' && <button type="button" className="btn ghost sm" style={{ marginTop: '.6rem' }} onClick={() => { setMode('pass'); setValue(''); setMsg(''); }}>Back to passphrase</button>}
      </form>
    </div>
  );
}
