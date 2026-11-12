import { useEffect, useMemo, useState } from 'react';
import { track } from '../db';
import { useApp } from '../state';
import { APP_VERSION } from '../version';
import {
  REQUEST_KINDS, STATUS_LABELS, allRequests, communityAvailable, flushRequests, isAdmin, myRequests, queueRequest, queuedRequests,
  submitRequest, updateRequest, type FeatureRequest, type RequestKind, type RequestStatus,
} from '../sync/community';
import { download, relTime } from '../lib/util';
import { ChipSelect, PageHead, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';

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
      <Segmented label="Show" value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'new', label: 'New' }, { value: 'planned', label: 'Planned' }, { value: 'all', label: 'All' }]} />
      <div style={{ margin: '.6rem 0' }}><ChipSelect value={kind} onChange={setKind} options={REQUEST_KINDS} /></div>
      <input id="admin-search" className="input" type="search" placeholder="Search requests" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search requests" />
      {list.map((r) => (
        <div key={r.id} className="card" style={{ marginTop: '.8rem' }}>
          <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><b>{r.title}</b><StatusTag s={r.status} /></div>
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
