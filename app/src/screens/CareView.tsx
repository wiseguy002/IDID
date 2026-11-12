/**
 * What a therapist (or anyone given a shared-view link) sees. No account, no journal, read-only.
 * The summary is decrypted here in their browser with the key from the link.
 */
import { useEffect, useState } from 'react';
import { fetchCareShare } from '../sync/supabase';
import { careRoleLabel, openPayload, parseCareToken, scopeSummary, type CarePayload } from '../lib/careShare';
import { fmtDateTime, moodLabel, relTime } from '../lib/util';
import { Bars } from './Insights';
import { Icon } from '../components/Icon';

type State = { k: 'loading' } | { k: 'gone' } | { k: 'error'; msg: string } | { k: 'ok'; p: CarePayload; updatedAt: number };
const FEELING: Record<string, string> = { good: 'Good', okay: 'Okay', wobbly: 'Wobbly', struggling: 'Struggling' };
const dayOf = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div><h4 style={{ margin: '.6rem 0 .2rem' }}>{title}</h4><ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>;
}

export default function CareView() {
  const [st, setSt] = useState<State>(() => (parseCareToken(location.hash) ? { k: 'loading' } : { k: 'gone' }));
  useEffect(() => {
    const t = parseCareToken(location.hash);
    if (!t) return;
    document.title = 'Shared journal · iDID';
    fetchCareShare(t.id)
      .then(async (row) => {
        if (!row) { setSt({ k: 'gone' }); return; }
        setSt({ k: 'ok', p: await openPayload(row.ct, t.key, t.id), updatedAt: Date.parse(row.updated_at) });
      })
      .catch((e) => setSt({ k: 'error', msg: /fetch|network/i.test(String(e)) ? "Couldn't reach iDID. Check your connection and try again." : "This link couldn't be opened. Check that the whole link was copied." }));
  }, []);

  return (
    <div className="app care-view">
      <main style={{ paddingTop: '1.4rem', maxWidth: 860 }}>
        <div className="row between no-print" style={{ marginBottom: '1rem' }}>
          <div className="row"><span className="brand-mark"><Icon name="leaf" size={20} /></span><b>iDID</b><span className="tag">Read-only</span></div>
          {st.k === 'ok' && <button className="btn sm" onClick={() => window.print()}><Icon name="print" size={16} /> Print</button>}
        </div>
        {st.k === 'loading' && <p className="muted">Opening the shared journal…</p>}
        {st.k === 'gone' && (
          <div className="card"><h1>This link isn't active</h1>
            <p>The person who shared it may have removed access, or it may have ended. If you think that's a mistake, ask them to send a new link.</p></div>
        )}
        {st.k === 'error' && <div className="card"><h1>Something went wrong</h1><p>{st.msg}</p></div>}
        {st.k === 'ok' && <Report p={st.p} updatedAt={st.updatedAt} />}
      </main>
    </div>
  );
}

function Report({ p, updatedAt }: { p: CarePayload; updatedAt: number }) {
  const s = p.stats;
  return (
    <article className="stack">
      <div className="card accent">
        <h1 style={{ marginBottom: '.2rem' }}>{p.who}'s journal</h1>
        <p style={{ margin: 0 }}>Shared with <b>{p.forName}</b> ({careRoleLabel(p.forRole)}) · {p.rangeLabel} · updated {relTime(updatedAt)}</p>
        <p className="small" style={{ margin: '.5rem 0 0' }}>{p.who} chose to share: {scopeSummary(p.scope).join(', ')}. Self-reported journal entries, not a clinical assessment. Please keep this link private.</p>
      </div>

      {p.profile && (
        <div className="card"><h2>About {p.profile.name}</h2>
          {p.profile.needs.length > 0 && <p className="small">Looking for support with: {p.profile.needs.join(', ')}</p>}
          {p.profile.parts && p.profile.parts.length > 0 && <><h4 style={{ margin: '.4rem 0' }}>{p.partWord.many[0].toUpperCase() + p.partWord.many.slice(1)}</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{p.profile.parts.map((x, i) => <li key={i}><b>{x.name}</b>{[x.pronouns, x.age && `age ${x.age}`, x.role].filter(Boolean).length ? ` · ${[x.pronouns, x.age && `age ${x.age}`, x.role].filter(Boolean).join(' · ')}` : ''}</li>)}</ul></>}
        </div>
      )}

      {s && (
        <div className="card"><h2>Patterns</h2>
          <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', margin: '.4rem 0 .8rem' }}>
            <div className="stat"><span className="tiny muted">Moments</span><b>{s.total}</b></div>
            <div className="stat"><span className="tiny muted">Usual mood</span><b style={{ fontSize: '1rem' }}>{s.avgMood ? moodLabel(Math.round(s.avgMood)) : '—'}</b></div>
            <div className="stat"><span className="tiny muted">Lost time</span><b>{s.lostTimePct}%</b></div>
            {s.fronting && <div className="stat"><span className="tiny muted">Co-fronting</span><b>{s.coFrontPct}%</b></div>}
          </div>
          <div className="grid2">
            <div><h3>Triggers</h3><Bars data={s.triggers} max={6} /></div>
            <div><h3>Places</h3><Bars data={s.locations} max={6} color="var(--warm)" /></div>
            <div><h3>Feelings</h3><Bars data={s.feelings} max={6} color="var(--accent-2)" /></div>
            <div><h3>How long</h3><Bars data={s.durations} max={6} /></div>
            {s.fronting && <div><h3>Fronting</h3><Bars data={s.fronting} max={6} color="var(--accent-2)" /></div>}
            <div><h3>Mood by week</h3><Bars data={s.weeks.filter((w) => w.avg != null).map((w) => [w.label, Math.round(w.avg! * 10) / 10] as [string, number])} max={12} /></div>
          </div>
        </div>
      )}

      {p.checkins && p.checkins.length > 0 && (
        <div className="card"><h2>Check-ins</h2>
          <div className="chips">{p.checkins.slice(-40).map((c, i) => <span key={i} className="chip" title={fmtDateTime(c.at)}>{dayOf(c.at)}: {FEELING[c.feeling] ?? c.feeling}</span>)}</div>
        </div>
      )}

      {p.entries && (
        <div className="card"><h2>Moments ({p.entries.length})</h2>
          {!p.entries.length && <p className="muted small">Nothing logged in this period.</p>}
          <div style={{ overflowX: 'auto' }}>
            <table className="care-table">
              <thead><tr><th>When</th><th>Where</th><th>Triggers</th><th>Mood</th>{p.scope.parts && <th>Fronting</th>}<th>How long</th>{(p.scope.notes || p.scope.observations) && <th>Notes</th>}</tr></thead>
              <tbody>{[...p.entries].reverse().map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{e.approx ? '~' : ''}{fmtDateTime(e.at)}{e.private ? <><br /><span className="tiny muted">only me</span></> : null}</td>
                  <td>{e.location}</td><td>{e.triggers.join(', ')}</td>
                  <td>{e.mood}{e.lostTime ? ' · lost time' : ''}{e.feelings.length ? <><br /><span className="tiny muted">{e.feelings.join(', ')}</span></> : null}</td>
                  {p.scope.parts && <td>{(e.fronting ?? []).join(', ')}{e.coFronting ? ' (co-fronting)' : ''}</td>}
                  <td>{e.duration}</td>
                  {(p.scope.notes || p.scope.observations) && <td>{[e.cause, e.notes, ...(e.noticed ?? [])].filter(Boolean).join(' — ')}</td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {p.safety && (
        <div className="card"><h2>Safety plan</h2>
          <List title="Warning signs" items={p.safety.warningSigns} /><List title="Things that help" items={p.safety.coping} />
          <List title="Distractions" items={p.safety.distractions} /><List title="People who can help" items={p.safety.helpers} />
          <List title="Professionals" items={p.safety.pros} /><List title="Making things safer" items={p.safety.safeSteps} />
          <List title="Reasons" items={p.safety.reasons} />
        </div>
      )}

      {p.meds && p.meds.length > 0 && (
        <div className="card"><h2>Medications</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{p.meds.map((m, i) => <li key={i}><b>{m.name}</b> {m.dose}{m.times.length ? ` · ${m.times.join(', ')}` : ' · as needed'}{m.notes ? ` · ${m.notes}` : ''}</li>)}</ul>
        </div>
      )}

      {p.appointments && p.appointments.length > 0 && (
        <div className="card"><h2>Appointments</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{p.appointments.map((a, i) => <li key={i}>{fmtDateTime(a.at)} · {a.title}{a.location ? ` · ${a.location}` : ''}</li>)}</ul>
        </div>
      )}

      {p.prep && p.prep.length > 0 && (
        <div className="card"><h2>Therapy prep</h2>
          {p.prep.map((x, i) => (
            <div key={i} style={{ marginBottom: '.8rem' }}><h3 style={{ margin: '.2rem 0' }}>Session {dayOf(x.sessionAt)}</h3>
              <List title="To talk about" items={x.agenda} /><List title="Questions" items={x.questions} /><List title="Wins" items={x.wins} />
              {x.afterNotes && <p className="small"><b>After:</b> {x.afterNotes}</p>}</div>
          ))}
        </div>
      )}
      <p className="tiny muted">Prepared with iDID. This view updates automatically when {p.who} uses iDID, and stops working if they remove access.</p>
    </article>
  );
}
