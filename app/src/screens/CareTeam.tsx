/**
 * Care team & shared views: give a therapist, counselor or anyone else a read-only view of exactly
 * what the person chooses, after they explicitly agree. They can change it or remove it any time.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAll } from '../db';
import { useApp } from '../state';
import { careShareStats, careSharingAvailable, createCareShare, removeAccount, removeCareShare, updateCareShare, useAccount } from '../sync/account';
import { careLink, careRoleLabel, defaultScope, RANGE_LABEL, SCOPE_ITEMS, scopeSummary } from '../lib/careShare';
import { relTime } from '../lib/util';
import { CARE_ROLES, type CareRole, type CareShare, type ShareScope } from '../types';
import { PageHead, Segmented, Sheet, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

const ENDS: { value: string; label: string; days: number | null }[] = [
  { value: 'never', label: 'Until I remove it', days: null }, { value: '90', label: '90 days', days: 90 }, { value: '365', label: '1 year', days: 365 },
];

function careMessage(s: CareShare) {
  return `Hi ${s.name}, here's a private, read-only link to what I've chosen to share from my iDID journal. It updates as I use iDID. Please keep it to yourself: anyone with the link can open it.\n\n${careLink(s)}`;
}

export function SendCareLink({ share }: { share: CareShare }) {
  const { toast } = useApp();
  const msg = careMessage(share);
  const email = share.contact.includes('@') ? share.contact.trim() : '';
  const phone = !email && /\d{3}/.test(share.contact) ? share.contact.replace(/[^\d+]/g, '') : '';
  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      {typeof navigator.share === 'function' && <button className="btn sm primary" onClick={() => navigator.share({ title: 'My iDID journal', text: msg }).catch(() => undefined)}><Icon name="share" size={16} /> Share…</button>}
      <a className="btn sm" href={`mailto:${email}?subject=${encodeURIComponent('My iDID journal (read-only)')}&body=${encodeURIComponent(msg)}`}>Email</a>
      <a className="btn sm" href={`sms:${phone}?&body=${encodeURIComponent(msg)}`}>Text</a>
      <button className="btn sm" onClick={() => navigator.clipboard?.writeText(careLink(share)).then(() => toast('Link copied.'), () => toast('Copy the link from the box below.'))}>Copy link</button>
    </div>
  );
}

interface Draft { name: string; role: CareRole; contact: string; subjectId: string; scope: ShareScope; range: CareShare['range']; ends: string }

/** Add someone (or change what an existing view shows). */
function ShareWizard({ existing, prefill, onClose }: { existing?: CareShare; prefill?: { memberId?: string; newName?: string; fromCircle?: string }; onClose: () => void }) {
  const { me, members, toast } = useApp();
  const subjects = members.filter((m) => m.tracked);
  const pm = prefill?.memberId ? members.find((m) => m.id === prefill.memberId) : undefined;
  const startRole: CareRole = existing?.role ?? (pm ? (pm.role === 'friend' ? 'friend' : 'family') : 'therapist');
  const [d, setD] = useState<Draft>(() => ({
    name: existing?.name ?? pm?.name ?? prefill?.newName ?? '', role: startRole, contact: existing?.contact ?? '',
    subjectId: existing?.subjectId ?? (me?.tracked ? me.id : subjects[0]?.id ?? ''), scope: existing?.scope ?? defaultScope(startRole),
    range: existing?.range ?? '90', ends: existing?.expiresAt ? 'custom' : 'never',
  }));
  const [step, setStep] = useState(existing ? 1 : 0);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<CareShare | null>(null);
  const who = members.find((m) => m.id === d.subjectId);
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });
  const included = scopeSummary(d.scope);
  const end = ENDS.find((e) => e.value === d.ends);
  const endText = d.ends === 'custom' && existing?.expiresAt ? `until ${new Date(existing.expiresAt).toLocaleDateString()}` : end?.days ? `for ${end.label}` : 'until you remove it';

  const finish = async () => {
    setBusy(true);
    try {
      const expiresAt = d.ends === 'custom' ? existing?.expiresAt ?? null : end?.days ? Date.now() + end.days * 86400000 : null;
      if (existing) {
        await updateCareShare(existing.id, { name: d.name.trim(), role: d.role, contact: d.contact.trim(), scope: d.scope, range: d.range, expiresAt, consentedAt: Date.now() });
        toast(`Updated what ${d.name.trim()} can see.`);
        onClose();
      } else {
        const { share } = await createCareShare({ name: d.name.trim(), role: d.role, contact: d.contact.trim(), subjectId: d.subjectId, memberId: prefill?.memberId ?? null, scope: d.scope, range: d.range, expiresAt, consentedAt: Date.now() });
        if (prefill?.fromCircle) await removeAccount(prefill.fromCircle).catch(() => undefined);
        setMade(share);
        setStep(3);
      }
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not share. Please try again.'); }
    setBusy(false);
  };

  return (
    <Sheet title={made ? `Send ${made.name} the link` : existing ? `What ${existing.name} can see` : 'Share with someone'} onClose={onClose}>
      {step === 0 && (
        <div className="stack">
          <label className="field"><span>Their name</span><input id="ct-name" className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Dr. Lee" autoFocus /></label>
          <label className="field"><span>Who they are to you</span>
            <select id="ct-role" className="input" value={d.role} onChange={(e) => { const role = e.target.value as CareRole; set({ role, scope: defaultScope(role) }); }}>
              {CARE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select></label>
          <label className="field"><span>Their email or phone (optional)</span><input id="ct-contact" className="input" value={d.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="Only used on your device, to send the link" /></label>
          {subjects.length > 1 && <label className="field"><span>Whose journal</span>
            <select className="input" value={d.subjectId} onChange={(e) => set({ subjectId: e.target.value })}>{subjects.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
          <button className="btn primary" disabled={!d.name.trim() || !d.subjectId} onClick={() => setStep(1)}>Next: choose what they see</button>
        </div>
      )}
      {step === 1 && (
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>{d.name} will be able to view, but never change, only what you turn on here.</p>
          <div className="scope-list">
            {SCOPE_ITEMS.filter((i) => i.key !== 'privateEntries' || d.scope.entries).map((i) => (
              <Switch key={i.key} label={i.label} hint={i.hint} checked={d.scope[i.key]} onChange={(v) => set({ scope: { ...d.scope, [i.key]: v } })} />
            ))}
          </div>
          <div className="eyebrow">How far back</div>
          <Segmented label="How far back" value={d.range} onChange={(range) => set({ range })} options={(['30', '90', '365', 'all'] as const).map((v) => ({ value: v, label: RANGE_LABEL[v].replace('Last ', '') }))} />
          <div className="eyebrow">How long they have access</div>
          <Segmented label="How long" value={d.ends} onChange={(ends) => set({ ends })} options={[...(existing?.expiresAt ? [{ value: 'custom', label: `Until ${new Date(existing.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` }] : []), ...ENDS.map((e) => ({ value: e.value, label: e.label }))]} />
          <div className="row">
            {!existing && <button className="btn" onClick={() => setStep(0)}>Back</button>}
            <button className="btn primary" disabled={!included.length} onClick={() => { setAgree(false); setStep(2); }}>Review and agree</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="stack">
          <div className="consent-box">
            <p style={{ marginTop: 0 }}><b>{d.name}</b> ({careRoleLabel(d.role)}) will be able to see, from {who?.id === me?.id ? 'your' : `${who?.name}'s`} journal ({RANGE_LABEL[d.range].toLowerCase()}):</p>
            <ul style={{ margin: '0 0 .6rem', paddingLeft: '1.2rem' }}>{included.map((x) => <li key={x}>{x}</li>)}</ul>
            <ul className="small" style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>They can only view it. They can't change or add anything.</li>
              <li>It updates as you use iDID, {endText}.</li>
              <li>Anyone with the link can open it, so send it to them privately.</li>
              <li>You can change what they see or remove their access at any time. Anything they've already seen or saved can't be taken back.</li>
              {prefill?.fromCircle && <li><b>{d.name} will leave your circle</b> and see only this.</li>}
            </ul>
          </div>
          <label className="row" style={{ alignItems: 'flex-start', gap: '.6rem', cursor: 'pointer' }}>
            <input id="ct-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
            <span>I choose to share this with {d.name || 'them'}, and I'm okay with them seeing it.</span>
          </label>
          <div className="row">
            <button className="btn" onClick={() => setStep(1)}>Back</button>
            <button className="btn primary" disabled={!agree || busy} onClick={finish}>{busy ? 'Sharing…' : existing ? 'Save changes' : `Share with ${d.name}`}</button>
          </div>
        </div>
      )}
      {step === 3 && made && (
        <div className="stack">
          <p className="small">Send this to {made.name} privately. It opens in any browser, with no account needed. You'll see here when they've looked at it.</p>
          <SendCareLink share={made} />
          <textarea className="input" readOnly value={careLink(made)} style={{ minHeight: 70, fontSize: '.78rem' }} onFocus={(e) => e.target.select()} aria-label="Shared view link" />
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      )}
    </Sheet>
  );
}

export default function CareTeam() {
  const { go, route, toast } = useApp();
  const a = useAccount();
  const shares = useAll('careShares');
  const [stats, setStats] = useState<Map<string, { views: number; last_viewed_at: string | null }>>(new Map());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CareShare | null>(null);
  const [sending, setSending] = useState<CareShare | null>(null);
  const [removing, setRemoving] = useState<CareShare | null>(null);
  const [contactFor, setContactFor] = useState<CareShare | null>(null);
  const prefill = route.name === 'careteam' && (route.memberId || route.newName) ? { memberId: route.memberId, newName: route.newName, fromCircle: route.fromCircle } : undefined;
  const available = careSharingAvailable();
  useEffect(() => { if (prefill && available) setAdding(true); }, []); // eslint-disable-line
  useEffect(() => { if (available) careShareStats().then(setStats).catch(() => undefined); }, [available, shares.length, a.lastSyncedAt]);
  const sorted = useMemo(() => [...shares].sort((x, y) => y.createdAt - x.createdAt), [shares]);

  return (
    <div className="fade-in">
      <PageHead title="Therapist & care team" sub="Share a read-only view with people who help you. You choose exactly what they see." onBack={() => go({ name: 'circle' })} />
      {!available ? (
        <div className="card">
          <h3>Connect online first</h3>
          <p className="small">Shared views live online, encrypted so only the link can open them. Sign in from <b>Circle → Connect devices &amp; invite</b>, then come back here.</p>
          <div className="row"><button className="btn primary" onClick={() => go({ name: 'account' })}>Connect online</button>
            <button className="btn" onClick={() => go({ name: 'share' })}>Print a one-time summary instead</button></div>
        </div>
      ) : (
        <>
          <button className="btn primary block" onClick={() => setAdding(true)}><Icon name="plus" size={18} /> Share with a therapist or someone else</button>
          {!sorted.length && <p className="small muted" style={{ marginTop: '1rem' }}>No one has a shared view yet. A therapist can read your patterns and moments before a session, without you having to print or email anything.</p>}
          {sorted.map((s) => {
            const st = stats.get(s.id);
            const ended = s.expiresAt != null && s.expiresAt < Date.now();
            return (
              <div className="card" key={s.id} data-testid="care-share">
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div><h3 style={{ margin: 0 }}>{s.name}</h3><span className="small muted">{careRoleLabel(s.role)}{s.contact ? ` · ${s.contact}` : ''}</span></div>
                  <span className={`tag status-${ended ? 'expired' : st?.views ? 'joined' : 'waiting'}`}>{ended ? 'Ended' : st?.views ? `Viewed ${relTime(Date.parse(st.last_viewed_at!))}` : 'Not opened yet'}</span>
                </div>
                <p className="small" style={{ margin: '.5rem 0' }}>Sees: {scopeSummary(s.scope).join(', ')} · {RANGE_LABEL[s.range].toLowerCase()}{s.expiresAt ? ` · ${ended ? 'ended' : 'until'} ${new Date(s.expiresAt).toLocaleDateString()}` : ''}</p>
                <p className="tiny muted" style={{ margin: '0 0 .6rem' }}>You agreed {new Date(s.consentedAt).toLocaleDateString()}{st ? ` · opened ${st.views} time${st.views === 1 ? '' : 's'}` : ''}{s.publishedAt ? ` · updated ${relTime(s.publishedAt)}` : ''}</p>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  {!ended && <button className="btn sm" onClick={() => setSending(s)}><Icon name="share" size={15} /> Send link</button>}
                  <button className="btn sm" onClick={() => setEditing(s)}>Change what they see</button>
                  <button className="btn sm" onClick={() => setContactFor(s)}>Edit details</button>
                  <button className="btn ghost danger sm" onClick={() => setRemoving(s)}>Remove access</button>
                </div>
              </div>
            );
          })}
          <p className="tiny muted" style={{ marginTop: '1rem' }}>Shared views are encrypted on your device. The key is in the link, so our server can't read them. Each view updates automatically while you use iDID.</p>
        </>
      )}
      {adding && <ShareWizard prefill={prefill} onClose={() => setAdding(false)} />}
      {editing && <ShareWizard existing={editing} onClose={() => setEditing(null)} />}
      {sending && <Sheet title={`Send to ${sending.name}`} onClose={() => setSending(null)}><SendCareLink share={sending} /></Sheet>}
      {contactFor && <DetailsSheet share={contactFor} onClose={() => setContactFor(null)} />}
      {removing && (
        <Sheet title={`Remove ${removing.name}'s access?`} onClose={() => setRemoving(null)}>
          <p>Their link will stop working straight away and the shared view is deleted from our server. Anything they already saw or saved stays with them.</p>
          <p className="small muted">If they've changed practice or contact details, remove this and share again with their new details.</p>
          <div className="row">
            <button className="btn danger" onClick={async () => { const n = removing.name; try { await removeCareShare(removing.id); toast(`${n} no longer has access.`); } catch (e) { toast(e instanceof Error ? e.message : 'Could not remove. Please try again.'); } setRemoving(null); }}>Remove access</button>
            <button className="btn ghost" onClick={() => setRemoving(null)}>Keep</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function DetailsSheet({ share, onClose }: { share: CareShare; onClose: () => void }) {
  const { toast } = useApp();
  const [name, setName] = useState(share.name);
  const [role, setRole] = useState<CareRole>(share.role);
  const [contact, setContact] = useState(share.contact);
  return (
    <Sheet title="Edit details" onClose={onClose}>
      <label className="field"><span>Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field"><span>Who they are to you</span><select className="input" value={role} onChange={(e) => setRole(e.target.value as CareRole)}>{CARE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
      <label className="field"><span>Email or phone</span><input className="input" value={contact} onChange={(e) => setContact(e.target.value)} /></label>
      <p className="tiny muted">This doesn't change what they can see. To send to a different person, remove access and share again.</p>
      <button className="btn primary" disabled={!name.trim()} onClick={async () => { await updateCareShare(share.id, { name: name.trim(), role, contact: contact.trim() }); toast('Saved.'); onClose(); }}>Save</button>
    </Sheet>
  );
}
