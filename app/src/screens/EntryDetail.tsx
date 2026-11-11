import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteEntry, uid } from '../db';
import { canSee, useApp } from '../state';
import { durationLabel, fmtDateTime, moodLabel, partWords, relTime } from '../lib/util';
import { Icon } from '../components/Icon';
import { PageHead, Sheet } from '../components/ui';
import { DURATIONS } from '../types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '' || (Array.isArray(children) && !children.length)) return null;
  return (
    <div style={{ padding: '.55rem 0', borderBottom: '1px solid var(--line)' }}>
      <div className="eyebrow" style={{ marginBottom: '.1rem' }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function EntryDetail({ id }: { id: string }) {
  const { me, members, parts, settings, go, toast } = useApp();
  const e = useLiveQuery(() => db.entries.get(id), [id]);
  const obs = useLiveQuery(() => db.observations.where('entryId').equals(id).toArray(), [id]) ?? [];
  const [note, setNote] = useState('');
  const [askOpen, setAskOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const w = partWords(settings.partWord);

  if (e === undefined) return null;
  if (!e || !canSee(me, e)) return <div><PageHead title="Not found" onBack={() => go({ name: 'timeline' })} /><p className="muted">This entry isn't available.</p></div>;

  const mName = (mid: string) => (mid === me?.id ? 'You' : members.find((m) => m.id === mid)?.name ?? 'Someone');
  const pName = (pid: string) => parts.find((p) => p.id === pid);
  const subj = members.find((m) => m.id === e.subjectId);
  const canEdit = e.authorId === me?.id || e.subjectId === me?.id;
  const done = obs.filter((o) => o.status === 'done');
  const pending = obs.filter((o) => o.status === 'requested');
  const askable = members.filter((m) => m.id !== me?.id && m.canObserve && !obs.some((o) => o.memberId === m.id));
  const myRequest = pending.find((o) => o.memberId === me?.id);

  const addNote = async () => {
    if (!note.trim() || !me) return;
    await db.entries.update(e.id, { followUps: [...e.followUps, { id: uid(), memberId: me.id, text: note.trim(), createdAt: Date.now() }], updatedAt: Date.now() });
    setNote('');
    toast('Note added.');
  };

  const ask = async (mid: string) => {
    await db.observations.put({ id: uid(), entryId: e.id, memberId: mid, status: 'requested', requestedAt: Date.now(), noticed: [], partIds: [], duration: null, text: '', present: null });
    toast(`${mName(mid)} will be asked next time they open IDID.`);
    setAskOpen(false);
  };

  const PartTag = ({ pid }: { pid: string }) => {
    const p = pName(pid);
    return p ? <span className="tag"><span style={{ width: 8, height: 8, borderRadius: 9, background: p.color }} />{p.name}</span> : null;
  };

  return (
    <div className="fade-in">
      <PageHead title={e.triggers[0] ? e.triggers.slice(0, 2).join(' · ') : 'A moment noted'} sub={`${e.timeApprox ? 'Around ' : ''}${fmtDateTime(e.occurredAt)}`} onBack={() => go({ name: 'timeline' })}
        right={canEdit ? <button className="iconbtn" aria-label="Edit" onClick={() => go({ name: 'log', entryId: e.id })}><Icon name="edit" /></button> : undefined} />

      {myRequest && (
        <div className="card blue row between">
          <span>You were asked if you noticed anything.</span>
          <button className="btn primary sm" onClick={() => go({ name: 'observe', id: myRequest.id })}>Add my note</button>
        </div>
      )}

      <div className="card">
        <Row label="About">{subj?.id === me?.id ? 'You' : subj?.name}{e.authorId !== e.subjectId ? <span className="muted small"> · noted by {mName(e.authorId)}</span> : null}</Row>
        <Row label="Where">{e.location}</Row>
        <Row label="Possible triggers">{e.triggers.length ? <div className="chips">{e.triggers.map((t) => <span key={t} className="tag">{t}</span>)}</div> : null}</Row>
        <Row label="What might have caused it">{e.possibleCause}</Row>
        <Row label="Mood">{e.mood ? <span className="row" style={{ gap: '.4rem' }}><span className={`orb m${e.mood}`} style={{ width: 14, height: 14, borderRadius: 9, display: 'inline-block' }} />{moodLabel(e.mood)}</span> : null}</Row>
        <Row label="Feelings">{e.feelings.join(', ')}</Row>
        <Row label="Intensity">{e.intensity ? ['', 'Mild', 'Moderate', 'Strong', 'Very strong'][e.intensity] : null}</Row>
        <Row label={`Fronting ${w.one}`}>{e.frontingPartIds.length || e.frontingUnknown ? <div className="chips">{e.frontingPartIds.map((p) => <PartTag key={p} pid={p} />)}{e.frontingUnknown && <span className="tag">Not sure / unknown</span>}</div> : null}</Row>
        <Row label="Co-fronting">{e.coFronting ? <div className="chips"><span className="tag">Yes</span>{e.coFrontPartIds.map((p) => <PartTag key={p} pid={p} />)}</div> : null}</Row>
        <Row label="Lost time">{e.lostTime ? 'Yes — some of this is hazy or missing' : null}</Row>
        <Row label="How long">{e.duration ? durationLabel(e.duration) : null}</Row>
        <Row label="Noticed by">{[...e.noticedByIds.map(mName), e.noticedByOthers].filter(Boolean).join(', ')}</Row>
        <Row label="Notes">{e.notes ? <span style={{ whiteSpace: 'pre-wrap' }}>{e.notes}</span> : null}</Row>
        <div className="tiny muted" style={{ marginTop: '.6rem' }}>{e.visibility === 'private' ? 'Private' : 'Shared with trust circle'} · logged {relTime(e.loggedAt)}</div>
      </div>

      <h2 style={{ marginTop: '1.4rem' }}>From the circle</h2>
      {done.length === 0 && pending.length === 0 && <p className="muted small">No one has added observations yet.</p>}
      {done.map((o) => (
        <div key={o.id} className="card soft">
          <div className="row between"><b>{mName(o.memberId)}</b><span className="tiny muted">{relTime(o.respondedAt ?? o.requestedAt)}</span></div>
          {o.present != null && <div className="small muted">{o.present ? 'Was there at the time' : 'Heard about it / noticed after'}</div>}
          {o.noticed.length > 0 && <div className="chips" style={{ margin: '.4rem 0' }}>{o.noticed.map((n) => <span key={n} className="tag">{n}</span>)}</div>}
          {o.partIds.length > 0 && <div className="small">Seemed like: {o.partIds.map((p) => pName(p)?.name).filter(Boolean).join(', ')}</div>}
          {o.duration && <div className="small">Lasted: {DURATIONS.find((d) => d.value === o.duration)?.label}</div>}
          {o.text && <p style={{ margin: '.4rem 0 0', whiteSpace: 'pre-wrap' }}>{o.text}</p>}
        </div>
      ))}
      {pending.filter((o) => o.memberId !== me?.id).length > 0 && (
        <p className="small muted">Waiting gently on: {pending.filter((o) => o.memberId !== me?.id).map((o) => mName(o.memberId)).join(', ')}</p>
      )}
      {e.visibility === 'circle' && askable.length > 0 && <button className="btn sm" onClick={() => setAskOpen(true)}><Icon name="bell" size={17} /> Ask someone what they noticed</button>}

      <h2 style={{ marginTop: '1.4rem' }}>Reflections</h2>
      {e.followUps.map((f) => (
        <div key={f.id} className="card soft">
          <div className="row between"><b>{mName(f.memberId)}</b><span className="tiny muted">{relTime(f.createdAt)}</span></div>
          <p style={{ margin: '.3rem 0 0', whiteSpace: 'pre-wrap' }}>{f.text}</p>
        </div>
      ))}
      <textarea className="input" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Add a reflection or something you remembered later" />
      <div className="row" style={{ marginTop: '.6rem' }}>
        <button className="btn primary sm" disabled={!note.trim()} onClick={addNote}>Add</button>
      </div>

      {canEdit && <><hr className="hr" /><button className="btn ghost danger sm" onClick={() => setConfirmDel(true)}><Icon name="trash" size={17} /> Delete this entry</button></>}

      {askOpen && (
        <Sheet title="Who might have noticed?" onClose={() => setAskOpen(false)}>
          <p className="muted small">They'll see a gentle request when they next open IDID on this device.</p>
          <div className="stack">{askable.map((m) => <button key={m.id} className="btn block" onClick={() => ask(m.id)}>{m.name}</button>)}</div>
        </Sheet>
      )}
      {confirmDel && (
        <Sheet title="Delete this entry?" onClose={() => setConfirmDel(false)}>
          <p>This removes the entry and any circle notes about it. It can't be undone.</p>
          <div className="row"><button className="btn" onClick={() => setConfirmDel(false)}>Keep it</button>
            <button className="btn primary" onClick={async () => { await deleteEntry(e.id); toast('Entry deleted.'); go({ name: 'timeline' }); }}>Delete</button></div>
        </Sheet>
      )}
    </div>
  );
}
