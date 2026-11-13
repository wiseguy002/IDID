import { useMemo, useState } from 'react';
import { store, uid, useAll } from '../db';
import { useApp } from '../state';
import { fmtDateTime, partWords, relTime } from '../lib/util';
import { BUCKET_LABEL, currentFront, frontPatterns, notesWaiting, roughDuration } from '../lib/fronting';
import type { FrontLog } from '../types';
import { Empty, PageHead, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

/** "Who's here?": a two-tap fronting log, front history, gentle patterns, and inner-board notes waiting for whoever arrives. */
export default function Fronting() {
  const { me, members, parts, settings, go, toast } = useApp();
  const w = partWords(settings.partWord);
  const owner = me?.tracked ? me : members.find((m) => m.tracked);
  const ps = parts.filter((p) => p.memberId === owner?.id && !p.archived);
  const logs = useAll('fronts').filter((l) => l.memberId === owner?.id);
  const board = useAll('board');
  const [pick, setPick] = useState<string[]>([]);
  const [unsure, setUnsure] = useState(false);
  const [blurry, setBlurry] = useState(false);
  const [note, setNote] = useState('');
  const [days, setDays] = useState(30);
  const [showAll, setShowAll] = useState(false);

  const now = currentFront(logs, owner?.id ?? '');
  const waiting = owner && now ? notesWaiting(board, owner.id, now.partIds) : [];
  const pat = useMemo(() => (owner ? frontPatterns(logs, owner.id, days) : null), [logs, owner, days]);
  const name = (id: string) => (id === '?' ? 'Not sure who' : ps.find((p) => p.id === id)?.name ?? `A ${w.one}`);
  const color = (id: string) => ps.find((p) => p.id === id)?.color ?? 'var(--line)';
  const history = [...logs].sort((a, b) => b.at - a.at);

  if (!owner) return <div><PageHead title="Who's here" onBack={() => go({ name: 'home' })} /><Empty title="No one's system is tracked yet">Turn on "Track their experiences" for someone in Circle.</Empty></div>;

  const save = async () => {
    const l: FrontLog = { id: uid(), memberId: owner.id, partIds: unsure ? [] : pick, unknown: unsure || !pick.length, blurry, note: note.trim(), at: Date.now() };
    await store.put('fronts', l);
    const n = notesWaiting(board, owner.id, l.partIds).length;
    setPick([]); setUnsure(false); setBlurry(false); setNote('');
    toast(n ? `Noted. There ${n === 1 ? 'is a note' : `are ${n} notes`} waiting on the inner board.` : 'Noted. Thank you for checking in.');
  };
  const toggle = (id: string) => { setUnsure(false); setPick(pick.includes(id) ? pick.filter((x) => x !== id) : [...pick, id]); };
  const totalTime = pat ? Object.values(pat.time).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="fade-in">
      <PageHead title="Who's here" sub={`A quick note of which ${w.many} are around. Private to your own devices.`} onBack={() => go({ name: 'home' })} />

      <div className="card">
        {now ? (
          <p className="small" style={{ marginTop: 0 }}>Last noted {relTime(now.at)}: <b>{now.unknown ? 'not sure who' : now.partIds.map(name).join(' and ')}</b>{now.blurry ? ', feeling blurry' : ''}.</p>
        ) : <p className="small muted" style={{ marginTop: 0 }}>Tap who's here right now. You can choose more than one, or "Not sure".</p>}
        <div className="chips">
          {ps.map((p) => <button key={p.id} className="chip" aria-pressed={pick.includes(p.id)} onClick={() => toggle(p.id)}><span className="dot" style={{ background: p.color }} />{p.name}</button>)}
          <button className="chip" aria-pressed={unsure} onClick={() => { setUnsure(!unsure); setPick([]); }}>Not sure</button>
        </div>
        {!ps.length && <p className="small muted">Add {w.many} in Circle to choose them here. You can still log "Not sure".</p>}
        {pick.length > 1 && <p className="tiny muted" style={{ margin: '.3rem 0 0' }}>The first one you tapped is noted as in front; the others as co-fronting.</p>}
        <Switch label="Things feel blurry or far away" checked={blurry} onChange={setBlurry} />
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="A word about it (optional)" aria-label="Note (optional)" />
        <button className="btn primary" style={{ marginTop: '.6rem' }} disabled={!pick.length && !unsure} onClick={save}><Icon name="check" size={16} /> Note who's here</button>
      </div>

      {waiting.length > 0 && (
        <div className="card warm">
          <div className="eyebrow"><Icon name="board" size={14} /> Waiting for {now!.partIds.map(name).join(' and ')}</div>
          {waiting.slice(0, 3).map((n) => (
            <div key={n.id} style={{ marginBottom: '.6rem' }}>
              <p style={{ margin: '0 0 .3rem', whiteSpace: 'pre-wrap' }}>{n.text}</p>
              <span className="tiny muted">From {n.fromPartId ? name(n.fromPartId) : 'someone'} · {relTime(n.createdAt)}</span>
              <div className="row" style={{ marginTop: '.3rem' }}>
                <button className="btn sm" onClick={() => store.patch('board', n.id, { seenBy: { ...n.seenBy, ...Object.fromEntries(now!.partIds.map((p) => [p, Date.now()])) } })}>Mark as read</button>
              </div>
            </div>
          ))}
          <button className="btn ghost sm" onClick={() => go({ name: 'board' })}>Open the inner board</button>
        </div>
      )}

      {pat && pat.logs >= 3 && (
        <div className="card soft">
          <div className="row between"><div className="eyebrow" style={{ margin: 0 }}><Icon name="chart" size={14} /> Patterns</div>
            <div className="chips">{[7, 30, 90].map((d) => <button key={d} className="chip" style={{ minHeight: 32, padding: '.2rem .6rem' }} aria-pressed={days === d} onClick={() => setDays(d)}>{d} days</button>)}</div></div>
          <p className="tiny muted">Rough, from {pat.logs} notes. A front with nothing noted after it counts for 12 hours at most. Only you can see this.</p>
          {Object.entries(pat.time).sort((a, b) => b[1] - a[1]).map(([id, ms]) => (
            <div key={id} style={{ margin: '.35rem 0' }}>
              <div className="row between small"><span><span className="dot" style={{ background: color(id) }} /> {name(id)}</span><span className="muted">{roughDuration(ms)}{pat.usualTime[id] ? `, often ${BUCKET_LABEL[pat.usualTime[id]]}` : ''}</span></div>
              <div className="meter" aria-hidden="true"><i style={{ width: `${Math.max(3, (ms / totalTime) * 100)}%`, background: color(id) }} /></div>
            </div>
          ))}
          {pat.switches.length > 0 && <>
            <div className="eyebrow" style={{ marginTop: '.8rem' }}>Common hand-overs</div>
            <ul className="small" style={{ margin: 0 }}>{pat.switches.map((s) => <li key={s.from + s.to}>{name(s.from)} → {name(s.to)} ({s.count}×)</li>)}</ul>
          </>}
          {pat.blurry > 0 && <p className="small" style={{ marginBottom: 0 }}>{pat.blurry} {pat.blurry === 1 ? 'time' : 'times'} things felt blurry. If that's happening a lot, it may be worth bringing to therapy.</p>}
        </div>
      )}

      <div className="card">
        <div className="eyebrow"><Icon name="clock" size={14} /> History</div>
        {!history.length && <p className="small muted" style={{ margin: 0 }}>Nothing noted yet.</p>}
        {(showAll ? history : history.slice(0, 12)).map((l) => (
          <div key={l.id} className="entry" style={{ padding: '.4rem 0' }}>
            <span className="bar" style={{ background: color(l.partIds[0] ?? '?') }} />
            <span className="small" style={{ flex: 1 }}><b>{l.unknown ? 'Not sure who' : l.partIds.map(name).join(' + ')}</b>{l.blurry ? ' · blurry' : ''}<br /><span className="muted">{fmtDateTime(l.at)}{l.note ? ` · ${l.note}` : ''}</span></span>
            <button className="btn ghost sm" aria-label="Delete this note" onClick={() => store.remove('fronts', l.id)}><Icon name="trash" size={16} /></button>
          </div>
        ))}
        {history.length > 12 && <button className="btn ghost sm" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${history.length}`}</button>}
      </div>
    </div>
  );
}
