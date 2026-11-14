import { useEffect, useMemo, useState } from 'react';
import { track } from '../db';
import { useApp } from '../state';
import { APP_VERSION } from '../version';
import {
  REQUEST_KINDS, STATUS_LABELS, allRequests, communityAvailable, flushRequests, isAdmin, myRequests, queueRequest, queuedRequests,
  submitRequest, updateRequest, featureCounts, type CountWeek, type FeatureRequest, type RequestKind, type RequestStatus,
} from '../sync/community';
import { download, relTime } from '../lib/util';
import { ChipSelect, PageHead, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';
import { SHAPE_ROLES, SHAPE_WAYS, isShapeRequest, shapeProblem, shapeRequest, type ShapeForm, type ShapeRole, type ShapeWay } from '../lib/shape';

function StatusTag({ s }: { s: RequestStatus }) {
  const tone = s === 'done' ? 'var(--accent-soft)' : s === 'planned' || s === 'in-progress' ? 'var(--accent-2-soft)' : s === 'declined' ? 'var(--surface-2)' : 'var(--warm-soft)';
  return <span className="tag" style={{ background: tone, color: 'var(--ink)' }}>{STATUS_LABELS[s]}</span>;
}

export default function Feedback() {
  const { me, go, toast } = useApp();
  const online = communityAvailable();
  const [kind, setKind] = useState<RequestKind>('feature');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<FeatureRequest[]>([]);
  const [admin, setAdmin] = useState(false);
  const queued = queuedRequests();

  const reload = () => { if (online) { myRequests().then(setMine).catch(() => undefined); isAdmin().then(setAdmin).catch(() => undefined); } };
  useEffect(() => { if (online) flushRequests().then((n) => { if (n) toast(`Sent ${n} saved request${n === 1 ? '' : 's'}.`); reload(); }); }, [online]); // eslint-disable-line

  const submit = async () => {
    const d = { kind, title: title.trim(), details: details.trim(), app_version: APP_VERSION };
    setBusy(true);
    try {
      if (online) { await submitRequest(d); toast('Thank you. Your request was sent to the iDID team.'); reload(); }
      else { queueRequest(d); toast('Saved. It will be sent when you sign in to the online circle.'); }
      track(me?.id, 'request');
      setTitle(''); setDetails('');
    } catch (e) {
      toast(e instanceof Error && /limit/.test(e.message) ? "You've sent a lot today. Please try again tomorrow." : 'Could not send right now. Please try again.');
    }
    setBusy(false);
  };

  return (
    <div className="fade-in">
      <PageHead title="Suggest a feature" sub="Ideas, services and fixes that would help you." onBack={() => go({ name: 'explore' })}
        right={admin ? <button className="btn sm" onClick={() => go({ name: 'admin' })}>Manage</button> : undefined} />
      <HelpShape online={online} onSent={reload} />
      <div className="card">
        <div className="eyebrow">What kind of request?</div>
        <ChipSelect multi={false} value={[kind]} onChange={(v) => v[0] && setKind(v[0] as RequestKind)} options={REQUEST_KINDS} />
        <label className="field" style={{ marginTop: '.8rem' }}><span>In a few words</span>
          <input id="fb-title" className="input" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. A sleep tracker, or a meditation timer" /></label>
        <label className="field"><span>Tell us more <span className="muted small">(optional)</span></span>
          <textarea id="fb-details" className="input" maxLength={4000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="How would it help? When would you use it?" /></label>
        <div className="card warm small" style={{ margin: '0 0 .8rem' }}>Requests are read by the iDID team, so they're <b>not</b> end-to-end encrypted like your journal. Please don't include names, health details or anything personal.</div>
        <button className="btn primary" disabled={busy || title.trim().length < 3} onClick={submit}><Icon name="send" size={17} /> {online ? 'Send request' : 'Save request'}</button>
        {!online && <p className="tiny muted" style={{ margin: '.5rem 0 0' }}>You're not signed in to the online circle. Requests are saved on this device and sent once you sign in.</p>}
      </div>

      {queued.length > 0 && <p className="small muted">{queued.length} request{queued.length === 1 ? '' : 's'} waiting to be sent.</p>}
      {mine.length > 0 && (
        <div className="card">
          <h2>Your requests</h2>
          {mine.map((r) => (
            <div key={r.id} style={{ padding: '.6rem 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row between" style={{ flexWrap: 'nowrap' }}><b className="small">{r.title}</b><StatusTag s={r.status} /></div>
              <div className="tiny muted">{REQUEST_KINDS.find((k) => k.value === r.kind)?.label} · {relTime(new Date(r.created_at).getTime())}</div>
              {r.admin_note && <div className="small" style={{ marginTop: '.3rem' }}><b>iDID team:</b> {r.admin_note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUSES = Object.keys(STATUS_LABELS) as RequestStatus[];

/** For the people who run iDID: triage and answer requests. Only visible to app admins. */
export function AdminRequests() {
  const { go, toast } = useApp();
  const [all, setAll] = useState<FeatureRequest[] | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<'open' | 'all' | RequestStatus>('open');
  const [kind, setKind] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () => allRequests().then(setAll).catch((e) => toast(e.message));
  useEffect(() => { isAdmin().then((a) => { setOk(a); if (a) load(); }); }, []); // eslint-disable-line

  const list = useMemo(() => (all ?? []).filter((r) =>
    (filter === 'all' || (filter === 'open' ? !['done', 'declined'].includes(r.status) : r.status === filter)) &&
    (!kind.length || kind.includes(r.kind)) &&
    (!q.trim() || `${r.title} ${r.details}`.toLowerCase().includes(q.trim().toLowerCase()))), [all, filter, kind, q]);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, (all ?? []).filter((r) => r.status === s).length])), [all]);

  const save = async (r: FeatureRequest, patch: { status?: RequestStatus; admin_note?: string | null }) => {
    try { await updateRequest(r.id, patch); setAll((all ?? []).map((x) => (x.id === r.id ? { ...x, ...patch } : x))); toast('Saved.'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save.'); }
  };

  const csv = () => {
    const rows = [['created_at', 'kind', 'status', 'title', 'details', 'app_version', 'team_note'], ...(all ?? []).map((r) => [r.created_at, r.kind, r.status, r.title, r.details, r.app_version ?? '', r.admin_note ?? ''])];
    download(`idid-requests-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n'), 'text/csv');
  };

  if (ok === false) return <div><PageHead title="Manage requests" onBack={() => go({ name: 'feedback' })} /><p className="muted">This page is only for the iDID team.</p></div>;
  if (!all) return <div><PageHead title="Manage requests" onBack={() => go({ name: 'feedback' })} /><p className="muted">Loading…</p></div>;

  return (
    <div className="fade-in">
      <PageHead title="Manage requests" sub={`${all.length} total · ${counts.new} new`} onBack={() => go({ name: 'feedback' })}
        right={<button className="btn sm" onClick={csv}><Icon name="download" size={16} /> CSV</button>} />
      <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '.8rem' }}>
        {(['new', 'planned', 'in-progress'] as RequestStatus[]).map((s) => <div key={s} className="stat"><span className="tiny muted">{STATUS_LABELS[s]}</span><b>{counts[s]}</b></div>)}
      </div>
      <UsageCard />
      <Segmented label="Show" value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'new', label: 'New' }, { value: 'planned', label: 'Planned' }, { value: 'all', label: 'All' }]} />
      <div style={{ margin: '.6rem 0' }}><ChipSelect value={kind} onChange={setKind} options={REQUEST_KINDS} /></div>
      <input id="admin-search" className="input" type="search" placeholder="Search requests" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search requests" />
      {list.map((r) => (
        <div key={r.id} className={`card${isShapeRequest(r) ? ' blue' : ''}`} style={{ marginTop: '.8rem' }}>
          <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><b>{r.title}</b><StatusTag s={r.status} /></div>
          {isShapeRequest(r) && <p className="tiny" style={{ margin: '.2rem 0' }}>Volunteer sign-up. Reply from hello@idid.care, and delete it if they ask.</p>}
          <div className="tiny muted">{REQUEST_KINDS.find((k) => k.value === r.kind)?.label} · {new Date(r.created_at).toLocaleString()} · app {r.app_version ?? '?'}</div>
          {r.details && <p className="small" style={{ whiteSpace: 'pre-wrap', margin: '.4rem 0' }}>{r.details}</p>}
          <label className="field" style={{ marginBottom: '.5rem' }}><span className="small">Status</span>
            <select className="input" value={r.status} onChange={(e) => save(r, { status: e.target.value as RequestStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select></label>
          <label className="field" style={{ marginBottom: '.4rem' }}><span className="small">Reply to the person (they'll see this)</span>
            <textarea className="input" style={{ minHeight: 60 }} maxLength={2000} value={notes[r.id] ?? r.admin_note ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} /></label>
          <button className="btn sm" disabled={(notes[r.id] ?? r.admin_note ?? '') === (r.admin_note ?? '')} onClick={() => save(r, { admin_note: (notes[r.id] ?? '').trim() || null })}>Save reply</button>
        </div>
      ))}
      {list.length === 0 && <p className="muted small" style={{ marginTop: '1rem' }}>Nothing matches.</p>}
    </div>
  );
}

/** Admins: anonymous weekly feature totals from people who opted in. */
function UsageCard() {
  const [weeks, setWeeks] = useState<CountWeek[] | null>(null);
  const [i, setI] = useState(0);
  useEffect(() => { featureCounts().then(setWeeks).catch(() => setWeeks([])); }, []);
  if (!weeks) return null;
  const w = weeks[i];
  return (
    <div className="card soft">
      <div className="row between"><h3 style={{ margin: 0 }}>Anonymous usage</h3>
        {weeks.length > 1 && <select className="input" style={{ width: 'auto' }} aria-label="Week" value={i} onChange={(e) => setI(Number(e.target.value))}>{weeks.map((x, n) => <option key={x.week} value={n}>{x.week}</option>)}</select>}</div>
      {!w ? <p className="small muted" style={{ margin: '.4rem 0 0' }}>No counts yet. They arrive weekly from people who turn on "Share anonymous counts".</p> : <>
        <p className="small muted" style={{ margin: '.3rem 0 .5rem' }}>{w.reports} {w.reports === 1 ? 'person' : 'people'} shared counts for {w.week}. "People" is how many used each screen at least once.</p>
        <table className="small" style={{ width: '100%' }}><thead><tr><th style={{ textAlign: 'left' }}>Screen</th><th>People</th><th>Uses</th></tr></thead>
          <tbody>{w.features.map((f) => <tr key={f.feature}><td>{f.feature}</td><td style={{ textAlign: 'center' }}>{f.people}</td><td style={{ textAlign: 'center' }}>{f.uses}</td></tr>)}</tbody></table>
      </>}
    </div>
  );
}

/** Opt-in: volunteer to help shape iDID (lived-experience council or clinical advisors). */
function HelpShape({ online, onSent }: { online: boolean; onSent: () => void }) {
  const { me, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<ShapeForm>({ roles: [], way: 'either', contact: '', name: '', note: '' });
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const problem = shapeProblem(f);
  const send = async () => {
    const d = shapeRequest(f, APP_VERSION);
    setBusy(true);
    try {
      if (online) { await submitRequest(d); onSent(); toast('Thank you! Someone from iDID will email you.'); }
      else { queueRequest(d); toast('Saved. It will be sent when you sign in to the online circle.'); }
      track(me?.id, 'request');
      setOpen(false); setF({ roles: [], way: 'either', contact: '', name: '', note: '' }); setOk(false);
    } catch (e) {
      toast(e instanceof Error && /limit/.test(e.message) ? "You've sent a lot today. Please try again tomorrow." : 'Could not send right now. Please try again.');
    }
    setBusy(false);
  };
  if (!open) return (
    <button className="card soft" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.9rem', alignItems: 'center' }} onClick={() => setOpen(true)}>
      <span style={{ color: 'var(--accent)' }}><Icon name="people" size={24} /></span>
      <span><b>Help shape iDID</b><br /><span className="small muted">Volunteer to try new features early and tell us what helps. Entirely optional.</span></span>
    </button>
  );
  return (
    <div className="card soft">
      <h2 style={{ marginTop: 0 }}>Help shape iDID</h2>
      <p className="small">We're gathering a small group of people with lived experience, people who support them, peer specialists and clinicians to try new features early and tell us honestly what helps and what doesn't. It's a short call every couple of months, or written feedback if you prefer. You can use a first name or a pseudonym, and stop any time. It's volunteer for now.</p>
      <div className="eyebrow">Which fits you? (choose any)</div>
      <ChipSelect value={f.roles} onChange={(v) => setF({ ...f, roles: v as ShapeRole[] })} options={SHAPE_ROLES} />
      <div className="eyebrow" style={{ marginTop: '.8rem' }}>How you'd like to take part</div>
      <Segmented label="How you'd like to take part" value={f.way} onChange={(v: ShapeWay) => setF({ ...f, way: v })} options={SHAPE_WAYS} />
      <label className="field" style={{ marginTop: '.8rem' }}><span>Email we can reply to</span>
        <input id="shape-email" className="input" type="email" autoComplete="email" maxLength={200} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="you@example.com" /></label>
      <label className="field"><span>What should we call you? <span className="muted small">(optional, a pseudonym is fine)</span></span>
        <input id="shape-name" className="input" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="field"><span>Anything we should know? <span className="muted small">(optional)</span></span>
        <textarea id="shape-note" className="input" maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Best times, accessibility needs, languages…" /></label>
      <label className="switch" style={{ marginBottom: '.6rem' }}>
        <span className="small">I understand the iDID team reads this, so it isn't end-to-end encrypted like my journal. It holds only what I typed here, never my journal.</span>
        <input type="checkbox" role="switch" checked={ok} onChange={(e) => setOk(e.target.checked)} />
      </label>
      {problem && (f.roles.length > 0 || f.contact) && <p className="small muted" role="status">{problem}</p>}
      <div className="row">
        <button className="btn primary" disabled={!!problem || !ok || busy} onClick={send}><Icon name="send" size={17} /> {online ? 'Send' : 'Save and send later'}</button>
        <button className="btn ghost" onClick={() => setOpen(false)}>Not now</button>
      </div>
      <p className="tiny muted" style={{ margin: '.6rem 0 0' }}>Prefer email? Write to <a href="mailto:hello@idid.care?subject=Help%20shape%20iDID">hello@idid.care</a>. You can ask us to delete your details any time.</p>
    </div>
  );
}

