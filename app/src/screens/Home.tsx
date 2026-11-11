import { useMemo, useState } from 'react';
import { store, uid, useAll } from '../db';
import { canSee, useApp } from '../state';
import { fmtDateTime, greeting, relTime, sinceLast, welcomeLine } from '../lib/util';
import { Icon } from '../components/Icon';

const DISMISS_KEY = 'idid.checkin.dismissed';
function readDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; }
}
function writeDismissed(ids: string[]) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(ids.slice(-200))); } catch { /* storage unavailable */ }
}

const REFLECTIONS = [
  'Has anything felt different since you were last here?',
  'Is there a moment from today you would like to remember?',
  'Did anything feel easier or harder than usual lately?',
  'Has anyone inside wanted to say something?',
];

export default function Home({ prevOpened }: { prevOpened: number | null }) {
  const { me, members, go, toast, settings } = useApp();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [reply, setReply] = useState('');
  const allEntries = useAll('entries');
  const allObs = useAll('observations');
  const entries = useMemo(() => [...allEntries].sort((a, b) => b.occurredAt - a.occurredAt), [allEntries]);
  const requests = allObs.filter((o) => o.memberId === me?.id && o.status === 'requested');
  const recentObs = useMemo(() => allObs.filter((o) => o.status === 'done').sort((a, b) => (b.respondedAt ?? 0) - (a.respondedAt ?? 0)), [allObs]);

  const visible = useMemo(() => entries.filter((e) => canSee(me, e)), [entries, me]);
  const mName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Someone';

  // Check-in: a recent entry (last 4 days), logged more than an hour ago, that this person was part of.
  const checkIn = settings.showCheckIn ? visible.find((e) =>
    (e.subjectId === me?.id || e.authorId === me?.id) && Date.now() - e.loggedAt > 3600_000 && Date.now() - e.occurredAt < 4 * 86400_000 &&
    !dismissed.includes(e.id) && !e.followUps.some((f) => f.memberId === me?.id && f.createdAt > e.loggedAt + 3600_000)) : undefined;

  const myObsOnMine = recentObs.filter((o) => {
    const e = entries.find((x) => x.id === o.entryId);
    return e && (e.subjectId === me?.id || e.authorId === me?.id) && o.memberId !== me?.id;
  }).slice(0, 3);

  const weekCount = visible.filter((e) => Date.now() - e.occurredAt < 7 * 86400_000).length;
  const back = sinceLast(prevOpened);
  const reflection = REFLECTIONS[new Date().getDay() % REFLECTIONS.length];

  const dismiss = (id: string) => { const d = [...dismissed, id]; setDismissed(d); writeDismissed(d); };
  const addFollowUp = async () => {
    if (!checkIn || !me || !reply.trim()) return;
    await store.patch('entries', checkIn.id, { followUps: [...checkIn.followUps, { id: uid(), memberId: me.id, text: reply.trim(), createdAt: Date.now() }], updatedAt: Date.now() });
    setReply('');
    dismiss(checkIn.id);
    toast('Thank you. Your reflection was added.');
  };

  return (
    <div className="stack fade-in">
      <section style={{ padding: '.6rem 0 .2rem' }}>
        <h1 style={{ fontSize: '1.85rem' }}>{greeting(me?.name ?? '')}</h1>
        <p className="muted" style={{ fontSize: '1.05rem' }}>{back ?? welcomeLine()}</p>
      </section>

      <button className="card accent" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '1rem', alignItems: 'center' }} onClick={() => go({ name: 'log' })}>
        <span className="brand-mark" style={{ width: 52, height: 52, background: 'var(--accent)', color: 'var(--accent-ink)' }}><Icon name="plus" size={26} /></span>
        <span>
          <b style={{ fontSize: '1.1rem' }}>Something felt different</b><br />
          <span className="small muted">Note it in a few taps — every step is optional.</span>
        </span>
      </button>

      {requests.map((r) => {
        const e = entries.find((x) => x.id === r.entryId);
        if (!e) return null;
        return (
          <div key={r.id} className="card blue">
            <div className="eyebrow"><Icon name="bell" size={14} /> A gentle request</div>
            <p style={{ marginBottom: '.6rem' }}><b>{mName(e.authorId)}</b> thought you might have noticed something around <b>{fmtDateTime(e.occurredAt)}</b>{e.location ? <> at {e.location}</> : null}. Would you add what you saw?</p>
            <div className="row">
              <button className="btn primary sm" onClick={() => go({ name: 'observe', id: r.id })}>Add my note</button>
              <button className="btn ghost sm" onClick={async () => { await store.patch('observations', r.id, { status: 'dismissed', respondedAt: Date.now() }); toast("Okay — we won't ask again."); }}>I didn't notice anything</button>
            </div>
          </div>
        );
      })}

      {checkIn ? (
        <div className="card">
          <div className="eyebrow"><Icon name="sparkle" size={14} /> Looking back</div>
          <p>On <b>{fmtDateTime(checkIn.occurredAt)}</b>{checkIn.location ? <> at {checkIn.location}</> : null}, {checkIn.subjectId === me?.id ? 'you' : mName(checkIn.subjectId)} noted a moment{checkIn.triggers.length ? <> — maybe linked to <i>{checkIn.triggers.slice(0, 2).join(', ').toLowerCase()}</i></> : null}. With a little distance, is there anything you'd add or understand differently now?</p>
          <textarea className="input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Anything at all — or nothing. Both are okay." />
          <div className="row" style={{ marginTop: '.6rem' }}>
            <button className="btn primary sm" disabled={!reply.trim()} onClick={addFollowUp}>Add reflection</button>
            <button className="btn ghost sm" onClick={() => dismiss(checkIn.id)}>Not now</button>
          </div>
        </div>
      ) : (
        <div className="card soft">
          <div className="eyebrow"><Icon name="sparkle" size={14} /> A question for today</div>
          <p>{reflection}</p>
          <div className="row">
            <button className="btn sm" onClick={() => go({ name: 'log' })}>Yes, note it</button>
            <button className="btn ghost sm" onClick={() => toast('Thank you for checking in.')}>All quiet</button>
          </div>
        </div>
      )}

      {myObsOnMine.length > 0 && (
        <div className="card">
          <div className="eyebrow"><Icon name="people" size={14} /> From your circle</div>
          {myObsOnMine.map((o) => (
            <button key={o.id} className="entry" style={{ background: 'none', border: 0, padding: '.4rem 0' }} onClick={() => go({ name: 'entry', id: o.entryId })}>
              <span className="bar" style={{ background: members.find((m) => m.id === o.memberId)?.color }} />
              <span><b>{mName(o.memberId)}</b> <span className="muted small">added a note {relTime(o.respondedAt ?? o.requestedAt)}</span><br />
                <span className="small">{o.text ? (o.text.length > 110 ? o.text.slice(0, 110) + '…' : o.text) : o.noticed.join(', ')}</span></span>
            </button>
          ))}
        </div>
      )}

      <div className="grid2">
        <button className="card" style={{ cursor: 'pointer', textAlign: 'left', margin: 0 }} onClick={() => go({ name: 'timeline' })}>
          <div className="eyebrow">This week</div>
          <b style={{ fontSize: '1.6rem' }}>{weekCount}</b>
          <div className="small muted">moment{weekCount === 1 ? '' : 's'} noted</div>
        </button>
        <button className="card" style={{ cursor: 'pointer', textAlign: 'left', margin: 0 }} onClick={() => go({ name: 'pause' })}>
          <div className="eyebrow">Need a pause?</div>
          <div style={{ color: 'var(--accent)' }}><Icon name="heart" size={28} /></div>
          <div className="small muted">Breathing & grounding</div>
        </button>
      </div>
    </div>
  );
}
