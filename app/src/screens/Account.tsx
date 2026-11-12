import { useEffect, useState } from 'react';
import { store, updateDevice } from '../db';
import { useApp } from '../state';
import { circleAccounts, currentUserId, join, sendCode, signOut, startCircle, syncNow, unlockKeys, useAccount, verifyCode } from '../sync/account';
import { enablePush, pushAvailable } from '../sync/push';
import { relTime, roleLabel } from '../lib/util';
import { PageHead, Sheet } from '../components/ui';
import { Icon } from '../components/Icon';
import { PALETTE } from '../lib/defaults';
import { mergeMember } from '../lib/merge';
import { InviteSheet } from '../components/Invites';
import { uid } from '../db';

export const INVITE_KEY = 'idid.invite';
export function pendingInvite(): string | null { try { return sessionStorage.getItem(INVITE_KEY); } catch { return null; } }
function clearInvite() { try { sessionStorage.removeItem(INVITE_KEY); } catch { /* ignore */ } }

function WhatServerSees() {
  return (
    <details className="card soft small">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>What our server can and can't see</summary>
      <ul style={{ paddingLeft: '1.2rem', marginBottom: 0 }}>
        <li><b>Can't see:</b> anything you write: entries, notes, names, parts, triggers, moods, appointments. Everything is encrypted on your device first, and the keys never leave your devices unencrypted.</li>
        <li><b>Can't see:</b> what kind of thing each record is. Record ids are scrambled.</li>
        <li><b>Can see:</b> your email address (to sign you in), which accounts share a circle, and when encrypted records change.</li>
        <li><b>Can see:</b> the times of reminders you turn on, so it can send a notification. Notifications only ever say something general, like "You have an appointment in 1 hour".</li>
        <li>"Only me" entries are encrypted with a key only your own devices hold, so other circle members can't read them either.</li>
      </ul>
    </details>
  );
}

/** After joining: connect this account to a person in the circle. */
function ClaimSelf({ onDone, suggested }: { onDone: () => void; suggested?: string | null }) {
  const { members, me, toast } = useApp();
  const myId = currentUserId();
  const unclaimed = members.filter((m) => m.id !== me?.id && (!m.userId || m.userId === myId));
  const [busy, setBusy] = useState(false);
  const claim = async (id: string) => {
    setBusy(true);
    // Fold this device's own profile into the circle's profile for them: their entries, parts,
    // check-ins, safety plan and the rest move across, and the duplicate disappears.
    if (me && me.id !== id) await mergeMember(store, me.id, id);
    await store.patch('members', id, { userId: myId ?? undefined });
    updateDevice({ activeMemberId: id });
    toast('Linked. Welcome to the circle.');
    onDone();
  };
  const addNew = async () => {
    const id = me?.id ?? uid();
    if (me) await store.patch('members', me.id, { userId: myId ?? undefined });
    else await store.put('members', { id, name: 'Me', role: 'other', tracked: false, canView: true, canObserve: true, color: PALETTE[members.length % PALETTE.length], createdAt: Date.now(), userId: myId ?? undefined });
    updateDevice({ activeMemberId: id });
    onDone();
  };
  return (
    <Sheet title="Is one of these people you?" onClose={onDone}>
      <p className="small muted">If someone in this circle already made a profile for you, choose it. Everything you've written on this device moves onto it, nothing is lost, and you won't appear twice. Your "only me" entries stay private.</p>
      <div className="stack">
        {[...unclaimed].sort((a, b) => Number(b.id === suggested) - Number(a.id === suggested)).map((m) => <button key={m.id} className={`btn block${m.id === suggested ? ' primary' : ''}`} disabled={busy} onClick={() => claim(m.id)}>{m.id === suggested ? "That's me: " : ''}{m.name} <span className="small" style={{ opacity: .8 }}>· {roleLabel(m)}</span></button>)}
        <button className="btn block ghost" disabled={busy} onClick={addNew}>None of these{me ? ` — keep me as "${me.name}"` : ''}</button>
      </div>
    </Sheet>
  );
}

export default function Account() {
  const { go, toast, members } = useApp();
  const a = useAccount();
  const [email, setEmail] = useState(a.email);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [inviting, setInviting] = useState(false);
  const [paste, setPaste] = useState('');
  const [claim, setClaim] = useState(false);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ user_id: string; role: string }[]>([]);
  const token = pendingInvite();

  useEffect(() => { if (a.phase === 'connected') circleAccounts().then(setAccounts).catch(() => undefined); }, [a.phase, a.lastSyncedAt]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setErr(/fetch|network|load failed/i.test(m) ? "Couldn't reach the server. Check your connection and try again." : m || 'Something went wrong. Please try again.');
    }
    setBusy(false);
  };
  const doJoin = (t: string) => run(async () => {
    const tk = t.includes('#invite=') ? t.split('#invite=')[1] : t.trim();
    const r = await join(tk);
    clearInvite();
    setSuggested(r.suggestedMemberId);
    setClaim(true);
  });

  return (
    <div className="fade-in">
      <PageHead title="Online circle" sub="Share with people you trust, on their own devices." onBack={() => go({ name: 'circle' })} />

      {a.phase === 'off' && (
        <div className="card">
          <h3>Not set up yet</h3>
          <p className="small">This copy of iDID works on this device only. To share a circle across devices, whoever hosts iDID connects it to a Supabase project (see the setup guide in the project README).</p>
          <p className="small muted" style={{ margin: 0 }}>Until then, you can share by exporting files from <b>Share & export</b>.</p>
        </div>
      )}

      {a.phase === 'signed-out' && (
        <div className="card">
          {token && <div className="card blue small">You've been invited to a circle. Sign in to join it.</div>}
          <h3>Sign in with your email</h3>
          <p className="small muted">We'll email you a 6-digit code. No password to remember for this step. Your journal passphrase still protects your data.</p>
          {!sent ? (
            <form onSubmit={(e) => { e.preventDefault(); run(async () => { await sendCode(email.trim()); setSent(true); }); }}>
              <input id="acct-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" />
              <button className="btn primary" style={{ marginTop: '.6rem' }} disabled={busy || !email.includes('@')}>Email me a code</button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); run(() => verifyCode(email.trim(), code)); }}>
              <p className="small">Check <b>{email}</b> for a code (or tap the link in the email).</p>
              <input id="acct-code" className="input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="123456" aria-label="Code from email" />
              <div className="row" style={{ marginTop: '.6rem' }}>
                <button className="btn primary" disabled={busy || code.length < 6}>Sign in</button>
                <button type="button" className="btn ghost sm" onClick={() => setSent(false)}>Use a different email</button>
              </div>
            </form>
          )}
        </div>
      )}

      {a.phase === 'needs-keys' && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); run(async () => {
          const r = await unlockKeys(pass);
          if (r === 'wrong-journal') throw new Error("That isn't this device's journal passphrase.");
          if (r === 'wrong-account') throw new Error('Your account was secured with a different passphrase. Use the same passphrase on every device.');
          setPass('');
        }); }}>
          <h3>Secure your account</h3>
          <p className="small muted">Signed in as {a.email}. Enter your journal passphrase. It encrypts the keys that let your devices read your circle. Use the same passphrase on each of your devices.</p>
          <input id="acct-pass" className="input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} aria-label="Journal passphrase" />
          <button className="btn primary" style={{ marginTop: '.6rem' }} disabled={busy || !pass}>{busy ? 'Securing…' : 'Continue'}</button>
        </form>
      )}

      {a.phase === 'needs-circle' && (
        <div className="card">
          {token ? (
            <>
              <h3>Join the circle you were invited to</h3>
              <p className="small muted">You'll see what the circle shares, and they'll see what you share. "Only me" entries stay private.</p>
              <button className="btn primary" disabled={busy} onClick={() => doJoin(token)}>Join circle</button>
            </>
          ) : (
            <>
              <h3>Start your online circle</h3>
              <p className="small muted">Everything on this device will be encrypted and backed up to your circle, then you can invite people.</p>
              <button className="btn primary" disabled={busy} onClick={() => run(async () => { await startCircle(); toast('Your circle is online.'); })}>Create our circle</button>
              <hr className="hr" />
              <label className="field"><span className="small">Or paste an invite link</span>
                <input id="acct-invite" className="input" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="https://…#invite=…" /></label>
              <button className="btn sm" disabled={busy || !paste.includes('.')} onClick={() => doJoin(paste)}>Join with this link</button>
            </>
          )}
        </div>
      )}

      {a.phase === 'connected' && (
        <>
          <div className="card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Connected</h3>
              <span className="tag">{a.status === 'syncing' ? 'Syncing…' : a.status === 'offline' ? 'Offline: will sync later' : a.status === 'error' ? 'Sync problem' : a.lastSyncedAt ? `Synced ${relTime(a.lastSyncedAt)}` : 'Ready'}</span>
            </div>
            <p className="small muted">Signed in as {a.email}. Changes sync automatically and are end-to-end encrypted.</p>
            {a.error && <p className="small" style={{ color: 'var(--warm)' }}>{a.error}</p>}
            <div className="row">
              <button className="btn sm" onClick={() => syncNow()}>Sync now</button>
              {pushAvailable() && <button className="btn sm" onClick={() => run(async () => { if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') throw new Error('Notifications are blocked in this browser.'); toast((await enablePush()) ? 'Notifications on for this device.' : "Couldn't turn on notifications."); })}><Icon name="bell" size={16} /> Notify this device</button>}
              {!members.some((m) => m.userId === currentUserId()) && <button className="btn sm" onClick={() => setClaim(true)}>Choose which person I am</button>}
            </div>
          </div>
          <div className="card">
            <h3>Invite someone</h3>
            <p className="small muted">Choose what they can see and do, then send the link from this device. Each link works once and expires in 7 days. The part after # holds the key and is never sent to our server. You'll see on your Circle page when they've joined.</p>
            <div className="row">
              <button className="btn primary" disabled={a.role === 'viewer'} onClick={() => setInviting(true)}><Icon name="people" size={17} /> Invite someone</button>
              <button className="btn sm" onClick={() => go({ name: 'circle' })}>See invitations</button>
            </div>
            {a.role === 'viewer' && <p className="small muted">You have view-only access, so you can't invite people.</p>}
          </div>
          <div className="card">
            <h3>Accounts in this circle</h3>
            {accounts.map((x) => {
              const m = members.find((mm) => mm.userId === x.user_id);
              return <div key={x.user_id} className="row between small" style={{ padding: '.3rem 0' }}><span>{m ? m.name : 'Not linked to a person yet'}{x.user_id === currentUserId() ? ' (you)' : ''}</span><span className="tag">{x.role === 'owner' ? 'owner' : x.role === 'viewer' ? 'view only' : 'can view and add'}</span></div>;
            })}
          </div>
          <button className="btn ghost danger sm" onClick={() => run(async () => { await signOut(); toast('Signed out. Your journal stays on this device.'); })}>Sign out on this device</button>
        </>
      )}

      {err && <p className="small" role="alert" style={{ color: 'var(--warm)' }}>{err}</p>}
      <div style={{ marginTop: '1rem' }}><WhatServerSees /></div>
      {claim && <ClaimSelf suggested={suggested} onDone={() => setClaim(false)} />}
      {inviting && <InviteSheet onClose={() => setInviting(false)} />}
    </div>
  );
}
