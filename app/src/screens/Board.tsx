import { useMemo, useState } from 'react';
import { store, uid, useAll } from '../db';
import { useApp } from '../state';
import { partWords, relTime } from '../lib/util';
import type { BoardNote } from '../types';
import { ChipSelect, Empty, PageHead } from '../components/ui';
import { Icon } from '../components/Icon';

/** A private notice board where parts of a system can leave notes for each other. */
export default function Board() {
  const { me, members, parts, settings, go, toast } = useApp();
  const w = partWords(settings.partWord);
  const tracked = members.filter((m) => m.tracked);
  const owner = me?.tracked ? me : tracked[0];
  const ps = parts.filter((p) => p.memberId === owner?.id && !p.archived);
  const pName = (id: string | null) => (id ? ps.find((p) => p.id === id)?.name ?? 'Someone' : 'Not sure who');
  const pColor = (id: string | null) => (id ? ps.find((p) => p.id === id)?.color : undefined) ?? 'var(--line)';
  const all = useAll('board').filter((n) => n.memberId === owner?.id);
  const [from, setFrom] = useState<string[]>([]);
  const [to, setTo] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [forPart, setForPart] = useState<string[]>([]);
  const [showDone, setShowDone] = useState(false);

  const list = useMemo(() => all
    .filter((n) => n.done === showDone && (!forPart.length || !n.toPartIds.length || n.toPartIds.some((p) => forPart.includes(p))))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt), [all, showDone, forPart]);

  if (!owner) return <div><PageHead title="Inner board" onBack={() => go({ name: 'circle' })} /><Empty title="No one's system is tracked yet">Turn on "Track their experiences" for someone in Circle.</Empty></div>;

  const post = async () => {
    const n: BoardNote = { id: uid(), memberId: owner.id, fromPartId: from[0] ?? null, toPartIds: to, text: text.trim(), pinned: false, done: false, seenBy: from[0] ? { [from[0]]: Date.now() } : {}, createdAt: Date.now() };
    await store.put('board', n);
    setText(''); setTo([]);
    toast('Note posted. Only your own devices can read it.');
  };
  const patch = (n: BoardNote, p: Partial<BoardNote>) => store.patch('board', n.id, p);
  const doneCount = all.filter((n) => n.done).length;

  return (
    <div className="fade-in">
      <PageHead title="Inner board" sub={`Notes between ${w.many}: plans, reminders, reassurance.`} onBack={() => go({ name: 'circle' })} />
      <div className="card">
        <div className="eyebrow">From</div>
        <ChipSelect multi={false} value={from} onChange={setFrom} options={ps.map((p) => ({ value: p.id, label: p.name, color: p.color }))} />
        {!ps.length && <p className="small muted" style={{ margin: 0 }}>Add {w.many} in Circle to sign notes. You can still post without a name.</p>}
        <div className="eyebrow" style={{ marginTop: '.8rem' }}>For</div>
        <div className="chips">
          <button className="chip" aria-pressed={to.length === 0} onClick={() => setTo([])}>Everyone</button>
          {ps.map((p) => <button key={p.id} className="chip" aria-pressed={to.includes(p.id)} onClick={() => setTo(to.includes(p.id) ? to.filter((x) => x !== p.id) : [...to, p.id])}><span className="dot" style={{ background: p.color }} />{p.name}</button>)}
        </div>
        <textarea id="board-text" className="input" style={{ marginTop: '.8rem' }} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000}
          placeholder={'e.g. "I booked the dentist for Thursday 3pm, nothing to worry about." or "Whoever finds this: you’re safe, it’s 2026."'} />
        <button className="btn primary" style={{ marginTop: '.6rem' }} disabled={!text.trim()} onClick={post}><Icon name="send" size={16} /> Post note</button>
        <p className="tiny muted" style={{ margin: '.5rem 0 0' }}>The inner board is private: it's encrypted with a key only your own devices hold, even if you share a circle.</p>
      </div>

      {ps.length > 0 && (
        <div style={{ margin: '.4rem 0 .6rem' }}>
          <div className="eyebrow">Show notes for</div>
          <ChipSelect value={forPart} onChange={setForPart} options={ps.map((p) => ({ value: p.id, label: p.name, color: p.color }))} />
        </div>
      )}
      {list.length === 0 && <Empty title={showDone ? 'No finished notes' : 'No notes yet'}>{showDone ? '' : `Leave the first note: a plan, a reminder, or something kind for another ${w.one}.`}</Empty>}
      {list.map((n) => (
        <div key={n.id} className="card" style={{ borderLeft: `6px solid ${pColor(n.fromPartId)}` }}>
          <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <div className="small"><b>{pName(n.fromPartId)}</b> <span className="muted">→ {n.toPartIds.length ? n.toPartIds.map(pName).join(', ') : 'everyone'} · {relTime(n.createdAt)}</span></div>
            {n.pinned && <span className="tag">Pinned</span>}
          </div>
          <p style={{ margin: '.45rem 0 .6rem', whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>{n.text}</p>
          {ps.length > 0 && (
            <div className="chips" style={{ gap: '.3rem', marginBottom: '.5rem' }}>
              <span className="tiny muted" style={{ alignSelf: 'center' }}>Seen by:</span>
              {ps.map((p) => (
                <button key={p.id} className="chip" style={{ minHeight: 32, padding: '.2rem .6rem', fontSize: '.8rem' }} aria-pressed={!!n.seenBy[p.id]}
                  onClick={() => { const s = { ...n.seenBy }; if (s[p.id]) delete s[p.id]; else s[p.id] = Date.now(); patch(n, { seenBy: s }); }}>{p.name}</button>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: '.3rem' }}>
            <button className="btn ghost sm" onClick={() => patch(n, { pinned: !n.pinned })}>{n.pinned ? 'Unpin' : 'Pin'}</button>
            <button className="btn ghost sm" onClick={() => patch(n, { done: !n.done })}>{n.done ? 'Bring back' : 'Mark done'}</button>
            <button className="btn ghost sm danger" onClick={() => store.remove('board', n.id)}>Delete</button>
          </div>
        </div>
      ))}
      {(doneCount > 0 || showDone) && <button className="btn ghost sm" onClick={() => setShowDone(!showDone)}>{showDone ? 'Show current notes' : `Show finished notes (${doneCount})`}</button>}
    </div>
  );
}
