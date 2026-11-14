import { useState } from 'react';
import { getLang, LANGS, setLang, t, type Lang } from '../i18n';
import { persist, store, track, updateSettings, wipeAll } from '../db';
import { changePassphrase, passphraseStrength, rotateRecoveryCode, unlockVault } from '../data/vault';
import { useApp } from '../state';
import type { PartWord, TextSize, ThemeName } from '../types';
import { PageHead, Segmented, Sheet, Switch } from '../components/ui';
import { Icon } from '../components/Icon';
import { permission, requestPermission } from '../lib/notify';
import { pushAvailable, enablePush } from '../sync/push';
import { passphraseChanged } from '../sync/account';
import { DEFAULT_RITUALS } from '../lib/nudges';
import { APP_VERSION, BUILD_COMMIT } from '../version';
import { clearTally } from '../lib/counts';
import { cloudConfigured } from '../sync/supabase';

export default function Settings() {
  const { settings: s, go, toast, me, checkIn } = useApp();
  const [ritualText, setRitualText] = useState('');
  const tellAFriend = async () => {
    const text = 'iDID is a free, private journal for dissociation and trauma responses, and for sharing what helps with people you trust.';
    if (navigator.share) { try { await navigator.share({ title: 'iDID', text, url: 'https://idid.care' }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(`${text} https://idid.care`); toast('Link copied. Paste it in a message to a friend.'); } catch { toast('Share this link: idid.care'); }
  };
  const rituals = me?.rituals ?? [];
  const setRituals = (r: string[]) => me && store.patch('members', me.id, { rituals: r });
  const [passOpen, setPassOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [passErr, setPassErr] = useState('');
  const [newCode, setNewCode] = useState<string | null>(null);
  const [perm, setPerm] = useState(permission());
  const turnOnNotifications = async () => {
    const p = await requestPermission();
    setPerm(p);
    if (p === 'granted') {
      if (pushAvailable()) {
        const ok = await enablePush().catch(() => false);
        toast(ok ? 'Notifications are on, even when iDID is closed.' : 'Notifications are on while iDID is open.');
      } else toast('Notifications are on while iDID is open.');
    } else if (p === 'denied') toast('Notifications are blocked. You can allow them in your browser or phone settings.');
  };
  const [wipe, setWipe] = useState(false);
  const [wipeText, setWipeText] = useState('');
  const up = (p: Parameters<typeof updateSettings>[0]) => {
    if (['theme', 'textSize', 'reduceMotion', 'readableFont', 'softEdges'].some((k) => k in p)) track(me?.id, 'comfort');
    return updateSettings(p);
  };

  const savePass = async () => {
    const key = await unlockVault(persist, oldPass);
    if (!key) { setPassErr("Your current passphrase didn't match."); return; }
    await changePassphrase(persist, key, pin);
    await passphraseChanged(pin).catch(() => toast('Passphrase changed here. Sign in again on other devices to update your account.'));
    setOldPass(''); setPin(''); setPin2(''); setPassErr(''); setPassOpen(false);
    toast('Passphrase changed.');
  };
  const newRecovery = async () => {
    const key = await unlockVault(persist, oldPass);
    if (!key) { setPassErr("Your current passphrase didn't match."); return; }
    setNewCode(await rotateRecoveryCode(persist, key));
    setOldPass(''); setPassErr('');
  };

  return (
    <div className="fade-in">
      <PageHead title="Settings" onBack={() => go({ name: 'home' })} />
      <div className="card">
        <h2>Comfort</h2>
        <div className="eyebrow">Colors</div>
        <Segmented label="Theme" value={s.theme} onChange={(v: ThemeName) => up({ theme: v })}
          options={[{ value: 'morning', label: 'Morning' }, { value: 'meadow', label: 'Meadow' }, { value: 'dusk', label: 'Dusk' }, { value: 'clear', label: 'High contrast' }]} />
        <div className="eyebrow" style={{ marginTop: '.9rem' }}>Text size</div>
        <Segmented label="Text size" value={s.textSize} onChange={(v: TextSize) => up({ textSize: v })}
          options={[{ value: 'small', label: 'A' }, { value: 'medium', label: 'A+' }, { value: 'large', label: 'A++' }, { value: 'xlarge', label: 'A+++' }]} />
        <Switch label="Calm motion" hint="No animations, slides or movement" checked={s.reduceMotion} onChange={(v) => up({ reduceMotion: v })} />
        <Switch label="Extra-readable text" hint="Wider spacing and a clearer typeface" checked={s.readableFont} onChange={(v) => up({ readableFont: v })} />
        <Switch label="Rounded shapes" hint="Turn off for simpler, squarer edges" checked={s.softEdges} onChange={(v) => up({ softEdges: v })} />
        <p className="tiny muted" style={{ margin: 0 }}>iDID never plays sounds, vibrates, or flashes.</p>
      </div>
      <div className="card">
        <h2>{t('Language & prompts')}</h2>
        <div className="eyebrow">{t('Language')}</div>
        <Segmented label={t('Language')} value={s.lang ?? getLang()} onChange={(v: Lang) => { setLang(v); up({ lang: v }); }} options={LANGS} />
        {getLang() === 'es' && <p className="tiny muted" style={{ margin: '.3rem 0 .6rem' }}>{t('Spanish is new. Some screens are still in English while we finish translating them.')}</p>}
        <label className="field"><span>Name of this space</span><input className="input" value={s.circleName} onChange={(e) => up({ circleName: e.target.value })} placeholder="iDID" /></label>
        <div className="eyebrow">I call them</div>
        <Segmented label="Word for parts" value={s.partWord} onChange={(v: PartWord) => up({ partWord: v })}
          options={[{ value: 'parts', label: 'Parts' }, { value: 'alters', label: 'Alters' }, { value: 'headmates', label: 'Headmates' }, { value: 'selves', label: 'Selves' }]} />
        <Switch label="Weekly reflection" hint="On the weekend, a gentle look back at your week. Never scored, always skippable" checked={!!s.weeklyReflection} onChange={(v) => up({ weeklyReflection: v })} />
        <Switch label="Looking-back check-ins" hint="When you return, gently ask if there's anything to add about a recent moment" checked={s.showCheckIn} onChange={(v) => up({ showCheckIn: v })} />
      </div>
      <div className="card">
        <h2>Gentle check-ins</h2>
        <p className="small muted">At random times, iDID asks whoever is here how they're doing, with a kind word and something small to try: breathing, one of your healthy rituals, or some fresh air and sunshine.</p>
        {me?.tracked ? (
          <>
            <Switch label="Random check-ins" checked={s.nudges} onChange={(v) => up({ nudges: v })} />
            {s.nudges && (
              <>
                <div className="eyebrow">How often</div>
                <Segmented label="Check-ins per day" value={String(s.nudgesPerDay)} onChange={(v) => up({ nudgesPerDay: Number(v) })}
                  options={[{ value: '1', label: 'Once a day' }, { value: '2', label: 'Twice' }, { value: '3', label: '3 times' }, { value: '4', label: '4 times' }]} />
                <div className="grid2" style={{ marginTop: '.8rem' }}>
                  <label className="field"><span className="small">Quiet from</span><input id="quiet-start" className="input" type="time" value={s.quietStart} onChange={(e) => e.target.value && up({ quietStart: e.target.value })} /></label>
                  <label className="field"><span className="small">until</span><input id="quiet-end" className="input" type="time" value={s.quietEnd} onChange={(e) => e.target.value && up({ quietEnd: e.target.value })} /></label>
                </div>
              </>
            )}
          </>
        ) : <p className="small">Random check-ins are for the person whose experiences are tracked. Switch to them on this device to turn them on.</p>}
        <div className="eyebrow" style={{ marginTop: '.4rem' }}>My healthy rituals</div>
        <p className="tiny muted" style={{ marginTop: 0 }}>Small things that help interrupt a hard pattern. Check-ins will suggest these first.</p>
        <div className="chips">
          {rituals.map((r) => <button key={r} className="chip" aria-pressed="true" aria-label={`Remove ${r}`} onClick={() => setRituals(rituals.filter((x) => x !== r))}>{r} <Icon name="close" size={14} /></button>)}
        </div>
        <form className="row" style={{ marginTop: '.5rem' }} onSubmit={(e) => { e.preventDefault(); const t = ritualText.trim(); if (t && !rituals.includes(t)) setRituals([...rituals, t]); setRitualText(''); }}>
          <input id="ritual-input" className="input" style={{ flex: 1 }} value={ritualText} onChange={(e) => setRitualText(e.target.value)} placeholder="e.g. Walk around the block with the dog" />
          <button className="btn sm" type="submit" disabled={!ritualText.trim()}>Add</button>
        </form>
        {rituals.length === 0 && (
          <div className="chips" style={{ marginTop: '.5rem' }}>
            {DEFAULT_RITUALS.slice(0, 5).map((r) => <button key={r} className="chip add" onClick={() => setRituals([...rituals, r])}><Icon name="plus" size={14} /> {r}</button>)}
          </div>
        )}
        <button className="btn sm" style={{ marginTop: '.8rem' }} onClick={checkIn}><Icon name="sparkle" size={16} /> Try a check-in now</button>
      </div>
      <div className="card">
        <h2>Notifications</h2>
        <p className="small muted">Notifications never show what you wrote, only a gentle nudge to open iDID.</p>
        {perm === 'granted'
          ? <p className="small"><span className="tag"><Icon name="bell" size={14} /> Notifications allowed on this device</span></p>
          : perm === 'unsupported'
            ? <p className="small muted">This browser can't show notifications. Reminders will appear inside iDID instead. On iPhone, add iDID to your Home Screen first.</p>
            : <button className="btn" onClick={turnOnNotifications}><Icon name="bell" size={18} /> Turn on notifications</button>}
        <Switch label="Appointment reminders" hint="Therapy, counseling, groups — at the times you choose" checked={s.notifyAppointments} onChange={(v) => up({ notifyAppointments: v })} />
        <Switch label="Medication reminders" hint="Only says “it's time”, never the medication" checked={s.notifyMeds} onChange={(v) => up({ notifyMeds: v })} />
        <Switch label="When someone asks what I noticed" checked={s.notifyObservations} onChange={(v) => up({ notifyObservations: v })} />
        <Switch label="Daily check-in reminder" checked={!!s.checkInTime} onChange={(v) => up({ checkInTime: v ? '20:00' : null })} />
        {s.checkInTime && (
          <label className="field"><span className="small">Remind me at</span>
            <input id="checkin-time" className="input" type="time" value={s.checkInTime} onChange={(e) => e.target.value && up({ checkInTime: e.target.value })} style={{ maxWidth: 180 }} /></label>
        )}
        <button className="btn sm" onClick={() => go({ name: 'appointments' })}><Icon name="clock" size={16} /> Manage appointments</button>
      </div>
      <div className="card">
        <h2>Privacy</h2>
        <p className="small muted">Your journal is encrypted on this device with your passphrase (AES-256). When it's locked, nothing can be read without the passphrase or your recovery code.</p>
        <div className="row">
          <button className="btn sm" onClick={() => { store.lock(); }}><Icon name="lock" size={17} /> Lock now</button>
          <button className="btn sm" onClick={() => setPassOpen(true)}>Change passphrase or recovery code</button>
        </div>
        <div className="eyebrow" style={{ marginTop: '.9rem' }}>Lock automatically when iDID is in the background for</div>
        <Segmented label="Auto-lock" value={String(s.autoLockMins)} onChange={(v) => up({ autoLockMins: Number(v) })}
          options={[{ value: '0', label: 'Right away' }, { value: '1', label: '1 min' }, { value: '5', label: '5 min' }, { value: '30', label: '30 min' }]} />
        <div className="eyebrow" style={{ marginTop: '.9rem' }}>Quick hide shows</div>
        <Segmented label="Quick hide screen" value={s.hideStyle} onChange={(v) => up({ hideStyle: v as 'calm' | 'notes' })}
          options={[{ value: 'calm', label: 'A calm clock' }, { value: 'notes', label: 'A plain notepad' }]} />
        <p className="tiny muted" style={{ margin: '.4rem 0 0' }}>Tap the eye icon at the top (or press Esc twice) to lock iDID instantly and show this screen. Tap it three times (or the ≡ menu) to come back to the lock screen.</p>
        <hr className="hr" />
        {cloudConfigured() && <>
          <Switch label="Share anonymous counts" hint="Once a week, how many times each screen was opened. Never what you write, never who you are. Off unless you turn it on" checked={!!s.shareCounts} onChange={(v) => { up({ shareCounts: v }); if (!v) clearTally(); }} />
          <p className="tiny muted" style={{ margin: '0 0 .6rem' }}>It helps us see which tools are useful. The counts are sent without your account, and our server only keeps totals for everyone together. <a href="https://idid.care/privacy#counts" target="_blank" rel="noopener noreferrer">How it works</a></p>
          <hr className="hr" />
        </>}
        <button className="btn" onClick={() => go({ name: 'share' })}><Icon name="download" size={18} /> Export & backup</button>
        <button className="btn ghost danger" style={{ marginLeft: '.4rem' }} onClick={() => setWipe(true)}>Delete all data</button>
      </div>
      <div className="card soft small">
        <div className="row between"><h3 style={{ margin: 0 }}>About iDID</h3><span className="tag">Version {APP_VERSION}</span></div>
        <p className="small" style={{ marginTop: '.5rem' }}><button className="btn sm" onClick={() => go({ name: 'help' })}><Icon name="help" size={15} /> Help &amp; guides</button> <button className="btn sm" onClick={() => go({ name: 'changelog' })}><Icon name="sparkle" size={15} /> What's new</button> <button className="btn sm" onClick={() => go({ name: 'explore' })}>Explore & badges</button> <button className="btn sm" onClick={() => go({ name: 'feedback' })}>Suggest a feature</button> <button className="btn sm" onClick={() => go({ name: 'feedback' })}>Help shape iDID</button> <button className="btn sm" onClick={tellAFriend}>Tell a friend</button> <span className="tiny muted">Build {BUILD_COMMIT}</span></p>
        <p>Learn more about dissociation, DID and grounding at <a href="https://idid.care/learn" target="_blank" rel="noopener noreferrer">idid.care/learn</a>.</p>
        <p>iDID is a private journal for noticing dissociative and trauma-related experiences, and for gathering gentle observations from people you trust. It is not a diagnostic tool or a substitute for professional care.</p>
        <p style={{ margin: 0 }}>If you are in danger or thinking about harming yourself, please contact local emergency services. In the US, call or text <b>988</b>. In the UK & Ireland, Samaritans: <b>116 123</b>.</p>
      </div>

      {passOpen && (
        <Sheet title="Passphrase & recovery" onClose={() => { setPassOpen(false); setNewCode(null); }}>
          <label className="field"><span>Current passphrase</span><input id="old-pass" className="input" type="password" autoComplete="current-password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} autoFocus /></label>
          {passErr && <p className="small" role="alert" style={{ color: 'var(--warm-text)' }}>{passErr}</p>}
          <label className="field"><span>New passphrase</span><input id="new-pass1" className="input" type="password" autoComplete="new-password" value={pin} onChange={(e) => setPin(e.target.value)} /></label>
          {pin && <p className="small muted" style={{ marginTop: '-.5rem' }}>{passphraseStrength(pin).hint}</p>}
          <label className="field"><span>New passphrase again</span><input id="new-pass2" className="input" type="password" autoComplete="new-password" value={pin2} onChange={(e) => setPin2(e.target.value)} /></label>
          <div className="row">
            <button className="btn primary" disabled={!oldPass || !passphraseStrength(pin).ok || pin !== pin2} onClick={savePass}>Change passphrase</button>
            <button className="btn" disabled={!oldPass} onClick={newRecovery}>Make a new recovery code</button>
          </div>
          {newCode && (
            <div className="card accent" style={{ marginTop: '1rem' }}>
              <p className="small">Your old recovery code no longer works. Save this one somewhere safe:</p>
              <div style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '1.1rem', userSelect: 'all' }}>{newCode}</div>
            </div>
          )}
        </Sheet>
      )}
      {wipe && (
        <Sheet title="Delete everything?" onClose={() => setWipe(false)}>
          <p>This permanently removes every person, entry and note from this device. Download a backup first if you might want them later.</p>
          <label className="field"><span>Type <b>delete</b> to confirm</span><input className="input" value={wipeText} onChange={(e) => setWipeText(e.target.value)} /></label>
          <button className="btn primary" disabled={wipeText.trim().toLowerCase() !== 'delete'} onClick={wipeAll}>Delete all data</button>
        </Sheet>
      )}
    </div>
  );
}
