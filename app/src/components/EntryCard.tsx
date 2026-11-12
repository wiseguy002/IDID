import type { Entry } from '../types';
import { useApp } from '../state';
import { durationLabel, fmtTime, moodLabel } from '../lib/util';

export function EntryCard({ e, obsCount = 0 }: { e: Entry; obsCount?: number }) {
  const { members, parts, me, go } = useApp();
  const subj = members.find((m) => m.id === e.subjectId);
  const fronting = e.frontingPartIds.map((id) => parts.find((p) => p.id === id)).filter(Boolean);
  const title = e.triggers[0] ? e.triggers.slice(0, 2).join(' · ') : e.feelings[0] ? e.feelings.slice(0, 2).join(' · ') : 'A moment noted';
  return (
    <button className="card entry" onClick={() => go({ name: 'entry', id: e.id })}>
      <span className="bar" style={{ background: fronting[0]?.color ?? subj?.color ?? 'var(--accent)' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="row between" style={{ flexWrap: 'nowrap' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{e.timeApprox ? '~' : ''}{fmtTime(e.occurredAt)}</span>
        </span>
        <span className="small muted" style={{ display: 'block', margin: '.15rem 0 .4rem' }}>
          {subj && subj.id !== me?.id ? `${subj.name} · ` : ''}{e.location || 'Location not noted'}{e.mood ? ` · ${moodLabel(e.mood)}` : ''}{e.duration ? ` · ${durationLabel(e.duration)}` : ''}
        </span>
        <span className="chips" style={{ gap: '.3rem' }}>
          {fronting.map((p) => <span key={p!.id} className="tag"><span className="dot" style={{ width: 8, height: 8, borderRadius: 9, background: p!.color }} />{p!.name}</span>)}
          {e.frontingUnknown && <span className="tag">Unknown fronter</span>}
          {e.coFronting && <span className="tag">Co-fronting</span>}
          {e.lostTime && <span className="tag">Lost time</span>}
          {e.visibility === 'private' && <span className="tag">Private</span>}
          {obsCount > 0 && <span className="tag">{obsCount} circle note{obsCount === 1 ? '' : 's'}</span>}
        </span>
      </span>
    </button>
  );
}
