import { useEffect, useMemo, useState } from 'react';
import { track, useAll } from '../db';
import { canSee, useApp } from '../state';
import { computeStats } from '../lib/stats';
import { sleepInsight } from '../lib/body';
import { moodLabel, partWords } from '../lib/util';
import { ChipSelect, Empty, PageHead, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';

export function Bars({ data, max = 6, color }: { data: [string, number][]; max?: number; color?: string }) {
  if (!data.length) return <p className="small muted">Nothing noted yet.</p>;
  const top = Math.max(...data.map((d) => d[1]));
  return (
    <div>
      {data.slice(0, max).map(([k, v]) => (
        <div key={k} className="barrow">
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k}>{k}</span>
          <span className="track"><span className="fill" style={{ width: `${(v / top) * 100}%`, display: 'block', background: color }} /></span>
          <span className="n">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function MoodLine({ weeks }: { weeks: { label: string; avg: number | null; count: number }[] }) {
  const W = 320, H = 120, pad = 18;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (weeks.length - 1);
  const y = (v: number) => H - pad - ((v - 1) / 4) * (H - pad * 2);
  const pts = weeks.map((w, i) => (w.avg == null ? null : [x(i), y(w.avg)] as const));
  let path = '';
  pts.forEach((p, i) => { if (p) path += `${pts[i - 1] ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`; });
  const maxC = Math.max(1, ...weeks.map((w) => w.count));
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" role="img" aria-label="Average mood by week, last 12 weeks">
      {[1, 3, 5].map((v) => <line key={v} x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 4" />)}
      {weeks.map((w, i) => <rect key={i} x={x(i) - 5} width={10} y={H - pad - (w.count / maxC) * 26} height={(w.count / maxC) * 26} rx={3} fill="var(--accent-2-soft)" />)}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="var(--accent)"><title>{`${weeks[i].label}: ${moodLabel(Math.round(weeks[i].avg!))} (${weeks[i].count} entries)`}</title></circle>)}
      <text x={pad} y={H + 12} fontSize="10" fill="var(--muted)">{weeks[0].label}</text>
      <text x={W - pad} y={H + 12} fontSize="10" fill="var(--muted)" textAnchor="end">This week</text>
      <text x={W - pad} y={y(5) - 4} fontSize="9" fill="var(--muted)" textAnchor="end">Settled</text>
      <text x={W - pad} y={y(1) - 4} fontSize="9" fill="var(--muted)" textAnchor="end">Very hard</text>
    </svg>
  );
}

export default function Insights() {
  const { me, members, parts, settings, go } = useApp();
  const [range, setRange] = useState<'30' | '90' | 'all'>('30');
  const tracked = members.filter((m) => m.tracked);
  const [who, setWho] = useState<string[]>(me?.tracked ? [me.id] : tracked[0] ? [tracked[0].id] : []);
  useEffect(() => { track(me?.id, 'patterns'); }, [me?.id]);
  const all = useAll('entries');
  const allCheckins = useAll('checkins');
  const allBody = useAll('body');
  const w = partWords(settings.partWord);
  const mName = (id: string) => members.find((m) => m.id === id)?.name ?? '';

  const entries = useMemo(() => all.filter((e) => canSee(me, e) && (!who.length || who.includes(e.subjectId)) &&
    (range === 'all' || e.occurredAt > Date.now() - Number(range) * 86400000)), [all, me, who, range]);
  const s = useMemo(() => computeStats(entries, parts, mName), [entries, parts]); // eslint-disable-line

  return (
    <div className="fade-in">
      <PageHead title="Patterns" sub="Gentle summaries — not judgements." />
      <Segmented label="Time range" value={range} onChange={setRange} options={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All time' }]} />
      {tracked.length > 1 && <div style={{ marginTop: '.7rem' }}><ChipSelect value={who} onChange={setWho} options={tracked.map((m) => ({ value: m.id, label: m.name, color: m.color }))} /></div>}

      {s.total === 0 ? (
        <div style={{ marginTop: '1rem' }}><Empty title="Patterns appear over time">After a few entries, you'll see what tends to come up, where, and when.</Empty></div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <div className="grid2" style={{ marginBottom: '.9rem' }}>
            <div className="stat"><span className="small muted">Moments</span><b>{s.total}</b></div>
            <div className="stat"><span className="small muted">Usual mood</span><b style={{ fontSize: '1.15rem', marginTop: '.3rem' }}>{s.avgMood ? moodLabel(Math.round(s.avgMood)) : '—'}</b></div>
            <div className="stat"><span className="small muted">With lost time</span><b>{s.lostTimePct}%</b></div>
            <div className="stat"><span className="small muted">Co-fronting</span><b>{s.coFrontPct}%</b></div>
          </div>
          {(() => {
            const cs = allCheckins.filter((c) => (!who.length || who.includes(c.memberId)) && (range === 'all' || c.at > Date.now() - Number(range) * 86400000));
            if (!cs.length) return null;
            const LABEL: Record<string, string> = { good: 'Pretty good', okay: 'Okay', wobbly: 'A bit wobbly', struggling: 'Struggling' };
            const IDEA: Record<string, string> = { breathe: 'Breathing', outside: 'Fresh air & sunshine' };
            const tried = cs.filter((c) => c.tried && c.helped != null);
            const helps = new Map<string, [number, number]>();
            for (const c of tried) {
              const k = c.tried === 'ritual' ? (c.ritual ?? 'A ritual') : IDEA[c.tried!] ?? c.tried!;
              const v = helps.get(k) ?? [0, 0];
              helps.set(k, [v[0] + (c.helped ? 1 : 0), v[1] + 1]);
            }
            return (
              <div className="card"><h3>Check-ins</h3>
                <p className="tiny muted">{cs.length} answer{cs.length === 1 ? '' : 's'} to "How are you doing?"</p>
                <Bars data={(['good', 'okay', 'wobbly', 'struggling'] as const).map((f) => [LABEL[f], cs.filter((c) => c.feeling === f).length] as [string, number]).filter(([, n]) => n > 0)} color="var(--accent-2)" />
                {helps.size > 0 && <>
                  <h3 style={{ marginTop: '.9rem' }}>What helps</h3>
                  {[...helps.entries()].sort((a, b) => b[1][0] - a[1][0]).map(([k, [y, n]]) => (
                    <div key={k} className="row between small" style={{ padding: '.25rem 0' }}><span>{k}</span><span className="muted">helped {y} of {n} time{n === 1 ? '' : 's'}</span></div>
                  ))}
                </>}
              </div>
            );
          })()}
          {(() => {
            const days = allBody.filter((b) => (!who.length || who.includes(b.memberId)) && (range === 'all' || new Date(b.date + 'T12:00').getTime() > Date.now() - Number(range) * 86400000));
            const si = sleepInsight(days, entries);
            if (!si) return null;
            return (
              <div className="card"><h3>Sleep and hard moments</h3>
                <Bars data={[['Under 6 hours’ sleep', Number(si.short.toFixed(1))], ['7 hours or more', Number(si.rested.toFixed(1))]]} color="var(--accent-2)" />
                <p className="tiny muted" style={{ margin: '.4rem 0 0' }}>Moments noted per day, after {si.shortDays} short and {si.restedDays} rested nights. A pattern, not a cause, but worth sharing with your care team.</p>
              </div>
            );
          })()}
          <div className="card"><h3>Mood over 12 weeks</h3><p className="tiny muted">Line: average mood · bars: number of moments</p><MoodLine weeks={s.weeks} /></div>
          <div className="card"><h3>Common triggers</h3><Bars data={s.triggers} /></div>
          <div className="card"><h3>Who was fronting</h3><Bars data={s.fronting} color="var(--accent-2)" /></div>
          {s.byPart.length > 0 && (
            <div className="card"><h3>Triggers that show up with each {w.one}</h3>
              {s.byPart.map((b) => (
                <div key={b.part!.id} style={{ padding: '.4rem 0' }}>
                  <span className="tag" style={{ marginRight: '.4rem' }}><span style={{ width: 8, height: 8, borderRadius: 9, background: b.part!.color }} />{b.part!.name}</span>
                  <span className="small">{b.top.map(([t, n]) => `${t} (${n})`).join(', ')}</span>
                </div>
              ))}
            </div>
          )}
          <div className="card"><h3>Where it happens</h3><Bars data={s.locations} color="var(--warm)" /></div>
          <div className="card"><h3>When it happens</h3>
            <div className="heat" role="table" aria-label="Moments by day and time of day">
              <div /> {['Night', 'Morn', 'Aft', 'Eve'].map((h) => <div key={h} className="muted">{h}</div>)}
              {s.heat.map((r) => [
                <div key={r.day} className="muted" style={{ justifyItems: 'start' }}>{r.day}</div>,
                ...r.slots.map((v, i) => <div key={r.day + i} title={`${r.day}: ${v}`} style={{ background: v ? `color-mix(in srgb, var(--accent) ${15 + (v / s.heatMax) * 70}%, var(--surface-2))` : 'var(--surface-2)', color: v / s.heatMax > .6 ? 'var(--accent-ink)' : 'var(--muted)' }}>{v || ''}</div>),
              ])}
            </div>
          </div>
          <div className="card"><h3>Feelings</h3><Bars data={s.feelings} color="var(--accent-2)" /></div>
          <div className="card"><h3>How long it lasted</h3><Bars data={s.durations} /></div>
          {s.noticed.length > 0 && <div className="card"><h3>Who tends to notice</h3><Bars data={s.noticed} color="var(--warm)" /></div>}
          <button className="btn block" onClick={() => go({ name: 'share' })}><Icon name="share" size={18} /> Export or share with a clinician</button>
        </div>
      )}
    </div>
  );
}
