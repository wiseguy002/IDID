import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { persist, store, wipeAll } from '../db';
import { markSampleDevice, SAMPLE_PASSPHRASE, startWithSignIn } from '../lib/sample';
import { cloudConfigured } from '../sync/supabase';
import { changePassphrase, passphraseStrength, unlockVault, unlockWithRecovery } from '../data/vault';
import { Icon } from '../components/Icon';

/** The confirmation word, in English or Spanish. */
const isErase = (s: string) => ['erase', 'borrar'].includes(s.trim().toLowerCase());

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
      setMsg(t("That passphrase didn't match. Take your time: capitals and spaces count. If your phone filled it in for you, try typing it yourself."));
    } else if (mode === 'recover') {
      const k = await unlockWithRecovery(persist, value);
      if (k) { setKey(k); setMode('reset'); setValue(''); }
      else setMsg(t("That recovery code didn't match. Check each group of letters."));
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
        <h2 style={{ marginTop: '1rem' }}>{t('This device has the sample circle')}</h2>
        <p className="muted">{t("Someone explored iDID here with made-up entries. It isn't a real journal, so no passphrase is needed.")}</p>
        <div className="stack" style={{ marginTop: '1rem' }}>
          {online && <button className="btn primary block" onClick={() => erase(true)}>{t('I already use iDID: bring my journal here')}</button>}
          <button className={`btn block${online ? '' : ' primary'}`} onClick={() => erase(false)}>{t('Set up my own journal')}</button>
          <button className="btn ghost sm" onClick={async () => { await store.open(sampleKey); onUnlock(); }}>{t('Keep exploring the sample')}</button>
        </div>
        <p className="tiny muted" style={{ marginTop: '.8rem' }}>{t('Leaving removes the sample from this device.')}</p>
      </div>
    </div>
  );

  if (mode === 'replace') return (
    <div className="lock">
      <form style={{ width: '100%', maxWidth: 400, textAlign: 'center' }} onSubmit={(e) => { e.preventDefault(); if (isErase(confirm)) erase(online); }}>
        <div className="brand-mark" style={{ width: 56, height: 56, margin: '0 auto' }}><Icon name="lock" size={26} /></div>
        <h2 style={{ marginTop: '1rem' }}>{t('Not your journal?')}</h2>
        <p className="muted" style={{ textAlign: 'left' }}>{online ? t("If this device has someone else's journal, or an old one you don't need, you can erase it and then sign in to bring your own journal here.") : t("If this device has someone else's journal, or an old one you don't need, you can erase it and start fresh.")}</p>
        <div className="card warm small" style={{ textAlign: 'left' }}>{t("Erasing can't be undone. Anything in the journal on this device that was never connected to an online circle will be gone. If it might be yours, try your recovery code first.")}</div>
        <label className="field" style={{ textAlign: 'left', marginTop: '.8rem' }}><span>{t('Type the word erase to confirm')}</span>
          <input id="erase-confirm" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="none" /></label>
        <button className="btn primary block" style={{ marginTop: '.9rem' }} type="submit" disabled={!isErase(confirm)}>{online ? t('Erase and sign in') : t('Erase and start fresh')}</button>
        <button type="button" className="btn ghost sm" style={{ marginTop: '.6rem' }} onClick={() => { setMode('pass'); setConfirm(''); }}>{t('Back')}</button>
      </form>
    </div>
  );

  return (
    <div className="lock">
      <form style={{ width: '100%', maxWidth: 400, textAlign: 'center' }} onSubmit={(e) => { e.preventDefault(); if (!busy) submit(); }}>
        <div className="brand-mark" style={{ width: 56, height: 56, margin: '0 auto' }}><Icon name="lock" size={26} /></div>
        <h2 style={{ marginTop: '1rem' }}>{mode === 'reset' ? t('Choose a new passphrase') : t('Welcome back')}</h2>
        <p className="muted">{mode === 'pass' ? t('Your journal is locked and encrypted. Enter your passphrase to open it.') : mode === 'recover' ? t('Enter the recovery code you saved when you set up iDID.') : t('Your journal is open. Choose a passphrase you will remember.')}</p>
        {mode !== 'reset' ? (
          <input id="unlock-input" className="input" type={mode === 'pass' ? 'password' : 'text'} autoFocus autoComplete={mode === 'pass' ? 'current-password' : 'off'}
            value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === 'pass' ? t('Passphrase') : 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'} aria-label={mode === 'pass' ? t('Passphrase') : t('Recovery code')} />
        ) : (
          <>
            <input id="new-pass" className="input" type="password" autoFocus autoComplete="new-password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder={t('New passphrase')} aria-label={t('New passphrase')} />
            <p className="small muted" style={{ textAlign: 'left', marginTop: '.4rem' }}>{newPass && t(strength.hint)}</p>
          </>
        )}
        {msg && <p className="small" style={{ color: 'var(--warm)', marginTop: '.6rem' }} role="alert">{msg}</p>}
        <button className="btn primary block" style={{ marginTop: '.9rem' }} type="submit" disabled={busy || (mode === 'reset' ? !strength.ok : !value)}>
          {busy ? t('Opening…') : mode === 'pass' ? t('Unlock') : mode === 'recover' ? t('Use recovery code') : t('Save and open')}
        </button>
        {mode === 'pass' && <button type="button" className="btn ghost sm" style={{ marginTop: '.6rem' }} onClick={() => { setMode('recover'); setValue(''); setMsg(''); }}>{t('I forgot my passphrase')}</button>}
        {mode === 'pass' && <button type="button" className="btn ghost sm" onClick={() => { setMode('replace'); setMsg(''); }}>{t("This isn't my journal")}</button>}
        {mode === 'recover' && <button type="button" className="btn ghost sm" style={{ marginTop: '.6rem' }} onClick={() => { setMode('pass'); setValue(''); setMsg(''); }}>{t('Back to passphrase')}</button>}
      </form>
    </div>
  );
}
