/**
 * Inviting people to the online circle, seeing whether they've joined, reminding them, and choosing
 * what each person can do. Invite links are sent from this device (share sheet, text, email), never
 * by our server: the key in the link must not pass through it.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAll } from '../db';
import { useApp } from '../state';
import {
  cancelInvitation, circleAccounts, currentUserId, inviteStatuses, invitePerson, refreshRole, removeAccount, renewInvitation, setAccess, statusOf, transferCircle, useAccount,
  type InviteStatus,
} from '../sync/account';
import type { InviteRow, MembershipRow } from '../sync/remote';
import type { Invitation, Member } from '../types';
import { relTime } from '../lib/util';
import { Sheet } from './ui';
import { Icon } from './Icon';

const fmtDay = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function inviteMessage(inv: Invitation, expiresAt?: string) {
  const until = expiresAt ? ` It works once and expires on ${fmtDay(Date.parse(expiresAt))}.` : ' It works once.';
  return `Hi${inv.name ? ` ${inv.name}` : ''}, here's your invite to my iDID circle. Open it to set up iDID and join me.${until}\n\n${inv.link}`;
}

/** Ways to send an invite from this device. */
export function SendOptions({ inv, expiresAt }: { inv: Invitation; expiresAt?: string }) {
  const { toast } = useApp();
  const msg = inviteMessage(inv, expiresAt);
  const email = inv.contact.includes('@') ? inv.contact.trim() : '';
  const phone = !email && /\d{3}/.test(inv.contact) ? inv.contact.replace(/[^\d+]/g, '') : '';
  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      {typeof navigator.share === 'function' && <button className="btn sm primary" onClick={() => navigator.share({ title: 'Join my iDID circle', text: msg }).catch(() => undefined)}><Icon name="share" size={16} /> Share…</button>}
      <a className="btn sm" href={`sms:${phone}?&body=${encodeURIComponent(msg)}`}>Text</a>
      <a className="btn sm" href={`mailto:${email}?subject=${encodeURIComponent('Your invite to my iDID circle')}&body=${encodeURIComponent(msg)}`}>Email</a>
      <button className="btn sm" onClick={() => navigator.clipboard?.writeText(msg).then(() => toast('Invite copied.'), () => toast('Select the link and copy it.'))}>Copy</button>
    </div>
  );
}

/** Accounts and invite statuses for the connected circle, refreshed after each sync. */
export function useRoster() {
  const a = useAccount();
  const [accounts, setAccounts] = useState<MembershipRow[]>([]);
  const [rows, setRows] = useState<Map<string, InviteRow>>(new Map());
  const refresh = useCallback(() => {
    if (a.phase !== 'connected') return;
    circleAccounts().then(setAccounts).catch(() => undefined);
    inviteStatuses().then(setRows).catch(() => undefined);
    refreshRole().catch(() => undefined); // ownership may have been handed to this person
  }, [a.phase]);
  useEffect(() => { refresh(); }, [refresh, a.lastSyncedAt]);
  return { connected: a.phase === 'connected', isOwner: a.role === 'owner', canInvite: a.role === 'owner' || a.role === 'member', accounts, rows, refresh };
}

export const STATUS_LABEL: Record<InviteStatus, string> = { waiting: 'Invited · waiting', joined: 'Joined', expired: 'Invite expired', cancelled: 'Invite cancelled' };

/** One invitation with its status and what you can do about it. */
function InviteRowView({ inv, row, onChange, onSend }: { inv: Invitation; row?: InviteRow; onChange: () => void; onSend: (i: Invitation, expiresAt?: string) => void }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const st = statusOf(inv, row);
  const act = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : 'Something went wrong.'); } setBusy(false); onChange(); };
  return (
    <div className="invite-row" data-status={st}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <b>{inv.name || 'Someone'}</b>{inv.role === 'viewer' && <span className="small muted"> · view only</span>}<br />
          <span className="small muted">
            {st === 'joined' ? `Joined ${row?.used_at ? relTime(Date.parse(row.used_at)) : ''}`
              : st === 'waiting' ? `Invited ${relTime(inv.createdAt)} · expires ${row ? fmtDay(Date.parse(row.expires_at)) : ''}`
              : st === 'expired' ? `Invited ${relTime(inv.createdAt)} · the link has expired`
              : 'This link no longer works'}
          </span>
        </div>
        <span className={`tag status-${st}`}>{st === 'joined' ? '✓ Joined' : st === 'waiting' ? 'Waiting' : st === 'expired' ? 'Expired' : 'Cancelled'}</span>
      </div>
      {st !== 'joined' && (
        <div className="row" style={{ marginTop: '.5rem', flexWrap: 'wrap' }}>
          {st === 'waiting' && <button className="btn sm" disabled={busy} onClick={() => onSend(inv, row?.expires_at)}><Icon name="bell" size={15} /> Remind</button>}
          <button className="btn sm" disabled={busy} onClick={() => act(async () => { onSend(await renewInvitation(inv.id)); toast('New link ready. The old one no longer works.'); })}>New link</button>
          {st === 'waiting' && <button className="btn ghost sm" disabled={busy} onClick={() => act(async () => { await cancelInvitation(inv.id); toast('Invite cancelled.'); })}>Cancel invite</button>}
        </div>
      )}
    </div>
  );
}

/** The "send it again" sheet, kept outside the rows so it stays open when a row moves (e.g. after New link). */
function useSendSheet() {
  const [sending, setSending] = useState<{ inv: Invitation; expiresAt?: string } | null>(null);
  const sheet = sending && (
    <Sheet title={`Send to ${sending.inv.name || 'them'}`} onClose={() => setSending(null)}>
      <p className="small muted">Send it the way they're most likely to see it. If it went to spam, a text often works best. It's sent from your device, so the key in the link never passes through our server.</p>
      <SendOptions inv={sending.inv} expiresAt={sending.expiresAt} />
    </Sheet>
  );
  return { onSend: (inv: Invitation, expiresAt?: string) => setSending({ inv, expiresAt }), sheet };
}

/** All invitations for this circle, newest first. */
export function InvitationsCard({ roster }: { roster: ReturnType<typeof useRoster> }) {
  const invites = useAll('invitations');
  const [showOld, setShowOld] = useState(false);
  const send = useSendSheet();
  if (!roster.connected || !invites.length) return null;
  const sorted = [...invites].sort((a, b) => b.createdAt - a.createdAt);
  const live = sorted.filter((i) => ['waiting', 'expired'].includes(statusOf(i, roster.rows.get(i.id))));
  const done = sorted.filter((i) => !live.includes(i));
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Invitations</h2>
      {!live.length && <p className="small muted">No invitations waiting.</p>}
      {live.map((i) => <InviteRowView key={i.id} inv={i} row={roster.rows.get(i.id)} onChange={roster.refresh} onSend={send.onSend} />)}
      {done.length > 0 && <button className="btn ghost sm" onClick={() => setShowOld(!showOld)}>{showOld ? 'Hide' : 'Show'} joined and cancelled ({done.length})</button>}
      {showOld && done.map((i) => <InviteRowView key={i.id} inv={i} row={roster.rows.get(i.id)} onChange={roster.refresh} onSend={send.onSend} />)}
      {send.sheet}
    </div>
  );
}

type Access = 'member' | 'viewer' | 'selected';
const ACCESS: { value: Access; label: string; hint: string }[] = [
  { value: 'member', label: 'Can view and add', hint: 'Sees what the circle shares, can log moments, add what they noticed, and use Check on me.' },
  { value: 'viewer', label: 'View only', hint: 'Sees what the circle shares, but can’t add or change anything. The server enforces this.' },
  { value: 'selected', label: 'Only selected information', hint: 'Not part of the circle. Gets a private, read-only view of just the things you choose.' },
];

export function AccessChoice({ value, onChange, isOwner }: { value: Access; onChange: (v: Access) => void; isOwner: boolean }) {
  return (
    <div className="stack" role="radiogroup" aria-label="What they can see and do" style={{ gap: '.4rem' }}>
      {ACCESS.map((o) => {
        const locked = o.value === 'viewer' && !isOwner;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={`access-opt${value === o.value ? ' on' : ''}`} disabled={locked} onClick={() => onChange(o.value)}>
            <b>{o.label}</b><span className="small muted">{locked ? 'Only the circle’s owner can give view-only access.' : o.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Invite someone (optionally a person already in the circle). */
export function InviteSheet({ member, onClose }: { member?: Member | null; onClose: () => void }) {
  const { go, toast } = useApp();
  const roster = useRoster();
  const [name, setName] = useState(member?.name ?? '');
  const [access, setAccessChoice] = useState<Access>('member');
  const [contact, setContact] = useState('');
  const [made, setMade] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  if (!roster.connected) {
    return (
      <Sheet title="Invite someone" onClose={onClose}>
        <p>To invite people on their own devices, connect your circle online first. It takes a minute: sign in with your email and choose <b>Create our circle</b>.</p>
        <button className="btn primary" onClick={() => { onClose(); go({ name: 'account' }); }}>Connect online</button>
      </Sheet>
    );
  }
  const make = async () => {
    if (access === 'selected') { onClose(); go({ name: 'careteam', memberId: member?.id, newName: name.trim() }); return; }
    setBusy(true);
    try { setMade(await invitePerson({ name: name.trim(), memberId: member?.id ?? null, role: access, contact: contact.trim() })); roster.refresh(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not make an invite.'); }
    setBusy(false);
  };
  return (
    <Sheet title={made ? `Send ${made.name || 'the'} invite` : member ? `Invite ${member.name}` : 'Invite someone'} onClose={onClose}>
      {!made ? (
        <div className="stack">
          {!member && <label className="field"><span>Who is it for?</span><input id="inv-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mom, Jordan" autoFocus /></label>}
          <div className="eyebrow">What they can see and do</div>
          <AccessChoice value={access} onChange={setAccessChoice} isOwner={roster.isOwner} />
          {access !== 'selected' && <label className="field"><span>Their email or phone (optional)</span>
            <input id="inv-contact" className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Used only on this device, to fill in Remind" /></label>}
          <button className="btn primary" disabled={busy || !name.trim()} onClick={make}>{access === 'selected' ? 'Choose what to share' : busy ? 'Making…' : 'Make invite link'}</button>
          <p className="tiny muted" style={{ margin: 0 }}>Each link works once and expires in 7 days. You'll see here when they join.</p>
        </div>
      ) : (
        <div className="stack">
          <p className="small">Send this to {made.name || 'them'} privately. You'll see <b>Joined</b> on your Circle page once they're in, and you can remind them or make a new link any time.</p>
          <SendOptions inv={made} />
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      )}
    </Sheet>
  );
}

/** Access controls for one person, shown in their profile. */
export function AccessPanel({ member, roster }: { member: Member; roster: ReturnType<typeof useRoster> }) {
  const { go, toast } = useApp();
  const invites = useAll('invitations');
  const shares = useAll('careShares');
  const [inviting, setInviting] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = useSendSheet();
  const [handing, setHanding] = useState(false);
  const [sure, setSure] = useState(false);
  const account = member.userId ? roster.accounts.find((x) => x.user_id === member.userId) : undefined;
  const pending = invites.filter((i) => i.memberId === member.id && statusOf(i, roster.rows.get(i.id)) === 'waiting').sort((a, b) => b.createdAt - a.createdAt)[0];
  const share = shares.find((s) => s.memberId === member.id);
  const isMe = member.userId && member.userId === currentUserId();
  const act = async (fn: () => Promise<void>, done: string) => { setBusy(true); try { await fn(); toast(done); } catch (e) { toast(e instanceof Error ? e.message : 'Something went wrong.'); } setBusy(false); roster.refresh(); };

  if (!roster.connected) return <p className="small muted">Connect your circle online (Circle → Connect devices &amp; invite) to invite {member.name} to use iDID on their own device.</p>;
  return (
    <div className="stack" style={{ gap: '.5rem' }}>
      <div className="eyebrow">Access</div>
      {isMe ? <p className="small muted" style={{ margin: 0 }}>This is you{account ? ` (${account.role === 'owner' ? 'circle owner' : account.role === 'viewer' ? 'view only' : 'can view and add'})` : ''}.</p>
        : account ? (
          <>
            <p className="small" style={{ margin: 0 }}>{member.name} uses iDID: <b>{account.role === 'owner' ? 'circle owner' : account.role === 'viewer' ? 'view only' : 'can view and add'}</b>.</p>
            {roster.isOwner && account.role !== 'owner' && (
              <>
                <AccessChoice value={account.role === 'viewer' ? 'viewer' : 'member'} isOwner onChange={(v) => {
                  if (v === 'selected') { go({ name: 'careteam', memberId: member.id, fromCircle: member.userId }); return; }
                  act(() => setAccess(member.userId!, v), v === 'viewer' ? `${member.name} can now only view.` : `${member.name} can now view and add.`);
                }} />
                <button className="btn sm" disabled={busy} onClick={() => setHanding(true)}><Icon name="people" size={15} /> Make {member.name} the circle's owner</button>
                <button className="btn ghost danger sm" disabled={busy} onClick={() => act(() => removeAccount(member.userId!), `${member.name} no longer has access. Anything already on their device stays there.`)}>Remove {member.name}'s access</button>
              </>
            )}
          </>
        ) : share ? (
          <div className="row between"><span className="small">{member.name} sees <b>selected information</b>{share.publishedAt ? '' : ' (not sent yet)'}.</span>
            <button className="btn sm" onClick={() => go({ name: 'careteam' })}>Manage</button></div>
        ) : pending ? (
          <InviteRowView inv={pending} row={roster.rows.get(pending.id)} onChange={roster.refresh} onSend={send.onSend} />
        ) : (
          <>
            <p className="small muted" style={{ margin: 0 }}>{member.name} doesn't use iDID yet{member.userId ? ' in this circle' : ''}.</p>
            {roster.canInvite ? <button className="btn sm primary" onClick={() => setInviting(true)}><Icon name="people" size={16} /> Invite {member.name}</button>
              : <p className="small muted" style={{ margin: 0 }}>You have view-only access, so you can't invite people.</p>}
          </>
        )}
      {inviting && <InviteSheet member={member} onClose={() => setInviting(false)} />}
      {send.sheet}
      {handing && (
        <Sheet title={`Make ${member.name} the owner?`} onClose={() => { setHanding(false); setSure(false); }}>
          <p>{member.name} will manage this circle: inviting people, choosing what each person can see and do, sharing with a care team, and removing access.</p>
          <ul className="small" style={{ paddingLeft: '1.2rem' }}>
            <li>You'll stay in the circle and can still view and add.</li>
            <li>Only {member.name} can change people's access after this, including yours.</li>
            <li>To get it back, {member.name} would need to hand it back to you.</li>
          </ul>
          <label className="row" style={{ alignItems: 'flex-start', gap: '.6rem', cursor: 'pointer', margin: '.6rem 0' }}>
            <input id="handover-sure" type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
            <span>I want {member.name} to manage this circle.</span>
          </label>
          <div className="row">
            <button className="btn primary" disabled={!sure || busy} onClick={() => act(async () => { await transferCircle(member.userId!); setHanding(false); }, `${member.name} now manages the circle.`)}>Make {member.name} the owner</button>
            <button className="btn ghost" onClick={() => { setHanding(false); setSure(false); }}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** A short status for a person in the People list. */
export function personStatus(m: Member, roster: ReturnType<typeof useRoster>, invites: Invitation[], shares: { memberId: string | null }[]): string {
  if (!roster.connected) return '';
  const acc = m.userId ? roster.accounts.find((x) => x.user_id === m.userId) : undefined;
  if (acc) return acc.role === 'owner' ? 'owner' : acc.role === 'viewer' ? 'view only' : 'uses iDID';
  if (shares.some((s) => s.memberId === m.id)) return 'sees selected info';
  const inv = invites.filter((i) => i.memberId === m.id).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (inv) { const st = statusOf(inv, roster.rows.get(inv.id)); if (st === 'waiting') return 'invited · waiting'; if (st === 'expired') return 'invite expired'; }
  return '';
}
