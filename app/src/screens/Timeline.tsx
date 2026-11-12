import { useEffect, useMemo, useState } from 'react';
import { track, useAll } from '../db';
import { canSee, useApp } from '../state';
import { fmtDate, partWords } from '../lib/util';
import { EntryCard } from '../components/EntryCard';
import { ChipSelect, Empty, PageHead } from '../components/ui';

export default function Timeline() {
  const { me, members, parts, settings, go } = useApp();
  const [q, setQ] = useState('');
  const [who, setWho] = useState<string[]>([]);
  const [part, setPart] = useState<string[]>([]);
  useEffect(() => { track(me?.id, 'timeline'); }, [me?.id]);
  const allEntries = useAll('entries');
  const entries = useMemo(() => [...allEntries].sort((a, b) => b.occurredAt - a.occurredAt), [allEntries]);
  const obs = useAll('observations').filter((o) => o.status === 'done');
  const w = partWords(settings.partWord);
  const tracked = members.filter((m) => m.tracked);

  const list = useMemo(() => entries.filter((e) => {
    if (!canSee(me, e)) return false;
    if (who.length && !who.includes(e.subjectId)) return false;
    if (part.length && !part.some((p) => e.frontingPartIds.includes(p) || e.coFrontPartIds.includes(p))) return false;
    if (q.trim()) {
      const hay = [e.location, e.notes, e.possibleCause, ...e.triggers, ...e.feelings, ...e.followUps.map((f) => f.text)].join(' ').toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  }), [entries, me, who, part, q]);

  const groups = useMemo(() => {
    const g: { day: string; items: typeof list }[] = [];
    for (const e of list) {
      const d = fmtDate(e.occurredAt);
      const last = g[g.length - 1];
      if (last?.day === d) last.items.push(e); else g.push({ day: d, items: [e] });
    }
    return g;
  }, [list]);

  const visibleParts = parts.filter((p) => !p.archived && (!who.length || who.includes(p.memberId)));

  return (
    <div className="fade-in">
      <PageHead title="Timeline" sub={`${list.length} moment${list.length === 1 ? '' : 's'}`} />
      <input className="input" type="search" placeholder="Search notes, places, triggers…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      {tracked.length > 1 && (
        <div style={{ marginTop: '.7rem' }}><ChipSelect value={who} onChange={setWho} options={tracked.map((m) => ({ value: m.id, label: m.name, color: m.color }))} /></div>
      )}
      {visibleParts.length > 0 && (
        <details style={{ marginTop: '.7rem' }}>
          <summary className="small muted" style={{ cursor: 'pointer' }}>Filter by {w.one}</summary>
          <div style={{ marginTop: '.5rem' }}><ChipSelect value={part} onChange={setPart} options={visibleParts.map((p) => ({ value: p.id, label: p.name, color: p.color }))} /></div>
        </details>
      )}
      {groups.length === 0 && (
        <div style={{ marginTop: '1rem' }}>
          <Empty title={entries.length ? 'Nothing matches those filters' : 'Nothing here yet'}>
            {entries.length ? 'Try clearing a filter.' : <>When something feels different, tap <b>Log</b>. Even one word helps.</>}
            {!entries.length && <div style={{ marginTop: '.8rem' }}><button className="btn primary sm" onClick={() => go({ name: 'log' })}>Note a moment</button></div>}
          </Empty>
        </div>
      )}
      {groups.map((g) => (
        <section key={g.day}>
          <div className="day-label">{g.day}</div>
          {g.items.map((e) => <EntryCard key={e.id} e={e} obsCount={obs.filter((o) => o.entryId === e.id).length} />)}
        </section>
      ))}
    </div>
  );
}
