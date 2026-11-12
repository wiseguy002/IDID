import { useMemo, useState } from 'react';
import { store, uid, useAll } from '../db';
import { canSee, useApp } from '../state';
import { fmtDateTime, greeting, relTime, sinceLast, welcomeLine } from '../lib/util';
import { Icon } from '../components/Icon';
import { useUpcoming } from './Appointments';
import { kindLabel } from '../lib/schedule';
import { APP_VERSION, RELEASES } from '../version';
import { compareVersions, releasesBetween } from '../lib/changelog';
import { patchActivity, updateDevice } from '../db';
import { useProgress } from './Explore';
import { nextTip } from '../lib/progress';
import { KindActCard, KindNoteView, useKindNotes } from './Kindness';
import { CheckOnCards } from '../components/CheckOn';
import { useAccount } from '../sync/account';

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
  const { me, members, go, toast, settings, openTour } = useApp();
  const { a: activity, facts, p: prog } = useProgress();
  const [kindNotes] = useKindNotes();
  const unreadKind = kindNotes.filter((n) => !n.read_at);
  const tip = settings.featureTips && facts && me ? nextTip(facts, activity, me.createdAt) : null;
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

  const soon = useUpcoming(7).slice(0, 2);
  // After an update: list what changed since the last version this device saw.
  const seen = settings.lastSeenVersion;
  const updated = seen && compareVersions(APP_VERSION, seen) > 0 ? releasesBetween(RELEASES, seen, APP_VERSION) : [];
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

  const { role } = useAccount();
  return (
    <div className="stack fade-in">
      <section style={{ padding: '.6rem 0 .2rem' }}>
        <h1 style={{ fontSize: '1.85rem' }}>{greeting(me?.name ?? '')}</h1>
        <p className="muted" style={{ fontSize: '1.05rem' }}>{back ?? welcomeLine()}</p>
      </section>
      {role === 'viewer' && <div className="card blue small" role="note"><b>You have view-only access to this circle.</b> You can see what the circle shares. Anything you add stays on this device and isn't shared. Ask the circle's owner if you'd like to add notes.</div>}

      <CheckOnCards />

      {updated.length > 0 && (
        <div className="card blue" role="status">
          <div className="eyebrow"><Icon name="sparkle" size={14} /> Updated to version {APP_VERSION}</div>
          <ul style={{ margin: '.2rem 0 .6rem', paddingLeft: '1.2rem' }}>
            {updated.map((r) => <li key={r.version} className="small"><b>{r.version}:</b> {r.summary}</li>)}
          </ul>
          <div className="row">
            <button className="btn sm" onClick={() => { updateDevice({ lastSeenVersion: APP_VERSION }); go({ name: 'changelog' }); }}>See what's new</button>
            <button className="btn ghost sm" onClick={() => updateDevice({ lastSeenVersion: APP_VERSION })}>Got it</button>
          </div>
        </div>
      )}

      {!settings.tourOffered && (
        <div className="card blue">
          <div className="eyebrow"><Icon name="sparkle" size={14} /> New here?</div>
          <p style={{ margin: '0 0 .6rem' }}>Would you like a one-minute tour of what iDID can do?</p>
          <div className="row">
            <button className="btn sm primary" onClick={() => { updateDevice({ tourOffered: true }); openTour(); }}>Show me around</button>
            <button className="btn sm ghost" onClick={() => { updateDevice({ tourOffered: true }); toast('No problem. The tour is in Explore whenever you want it.'); }}>Not now</button>
          </div>
        </div>
      )}

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

      <div className="card">
        <div className="row between"><div className="eyebrow" style={{ margin: 0 }}><Icon name="clock" size={14} /> Coming up</div>
          <button className="btn ghost sm" onClick={() => go({ name: 'appointments' })}>{soon.length ? 'All' : 'Add an appointment'}</button></div>
        {soon.length === 0 ? <p className="small muted" style={{ margin: '.3rem 0 0' }}>No appointments in the next week.</p> : soon.map(({ a, next }) => (
          <button key={a.id} className="entry" style={{ background: 'none', border: 0, padding: '.45rem 0' }} onClick={() => go({ name: 'appointments' })}>
            <span className="bar" style={{ background: 'var(--accent-2)' }} />
            <span><b>{a.title || kindLabel(a)}</b><br /><span className="small muted">{fmtDateTime(next)}{a.location ? ` · ${a.location}` : ''}</span></span>
          </button>
        ))}
      </div>

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

      {unreadKind.length > 0 && (
        <div className="card warm">
          <div className="eyebrow"><Icon name="sun" size={14} /> A kind note for you</div>
          <KindNoteView n={unreadKind[0]} />
          <div className="row" style={{ marginTop: '.4rem' }}>
            <button className="btn sm primary" onClick={() => go({ name: 'kindness' })}>Send one forward</button>
            {unreadKind.length > 1 && <span className="small muted">+{unreadKind.length - 1} more</span>}
          </div>
        </div>
      )}

      {settings.kindActs && <KindActCard compact />}

      {tip && me && (
        <div className="card soft">
          <div className="eyebrow"><Icon name="sparkle" size={14} /> Something that might help</div>
          <p style={{ margin: '0 0 .6rem' }}><b>{tip.name}.</b> {tip.tip}</p>
          <div className="row">
            <button className="btn sm" onClick={() => { patchActivity(me.id, { lastTipAt: Date.now() }); go(tip.route); }}>Show me</button>
            <button className="btn sm ghost" onClick={() => patchActivity(me.id, { lastTipAt: Date.now() })}>Not now</button>
            <button className="btn sm ghost" onClick={() => patchActivity(me.id, { lastTipAt: Date.now(), dismissedTips: [...activity.dismissedTips, tip.id] })}>Don't suggest this</button>
          </div>
        </div>
      )}

      <button className="card blue" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '.9rem', alignItems: 'center' }} onClick={() => go({ name: 'support' })}>
        <span style={{ color: 'var(--accent-2)' }}><Icon name="people" size={26} /></span>
        <span><b>Find support{me?.support?.zip ? ` near ${me.support.zip}` : ''}</b><br />
          <span className="small muted">{me?.support?.zip ? 'Specialists, helplines and community matched to your needs.' : 'Add your ZIP code to find therapists, crisis services and community near you.'}</span></span>
      </button>

      <div className="card soft" style={{ padding: '.9rem' }}>
        <div className="eyebrow">My tools</div>
        <div className="row" style={{ gap: '.45rem' }}>
          <button className="btn sm" onClick={() => go({ name: 'calm' })}><Icon name="sparkle" size={16} /> Calm space</button>
          <button className="btn sm" onClick={() => go({ name: 'body' })}><Icon name="body" size={16} /> Body basics</button>
          <button className="btn sm" onClick={() => go({ name: 'safety' })}><Icon name="shield" size={16} /> Safety plan</button>
          <button className="btn sm" onClick={() => go({ name: 'comfort' })}><Icon name="box" size={16} /> Comfort kit</button>
          {me?.tracked && <button className="btn sm" onClick={() => go({ name: 'board' })}><Icon name="board" size={16} /> Inner board</button>}
          <button className="btn sm" onClick={() => go({ name: 'prep' })}><Icon name="clipboard" size={16} /> Prepare for therapy</button>
          <button className="btn sm" onClick={() => go({ name: 'careteam' })}><Icon name="shield" size={16} /> Share with my therapist</button>
          <button className="btn sm" onClick={() => go({ name: 'help' })}><Icon name="help" size={16} /> Help &amp; guides</button>
        </div>
      </div>

      <div className="grid2">
        <button className="card" style={{ cursor: 'pointer', textAlign: 'left', margin: 0 }} onClick={() => go({ name: 'timeline' })}>
          <div className="eyebrow">This week</div>
          <b style={{ fontSize: '1.6rem' }}>{weekCount}</b>
          <div className="small muted">moment{weekCount === 1 ? '' : 's'} noted</div>
        </button>
        <button className="card" style={{ cursor: 'pointer', textAlign: 'left', margin: 0 }} onClick={() => go({ name: 'explore' })}>
          <div className="eyebrow">Explore</div>
          <b style={{ fontSize: '1.6rem' }}>{prog?.used.length ?? 0}<span className="small muted" style={{ fontWeight: 400 }}> / {prog?.total ?? 0}</span></b>
          <div className="small muted">features tried{settings.badges && prog ? ` · ${prog.earned.length} badges` : ''}</div>
        </button>
      </div>
    </div>
  );
}
