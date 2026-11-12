import { useMemo, useState } from 'react';
import { store, uid, useAll } from '../db';
import { useApp } from '../state';
import { kindLabel, nextOccurrence, previousOccurrence } from '../lib/schedule';
import { countBy, fmtDateTime, moodLabel } from '../lib/util';
import type { SessionPrep } from '../types';
import { ListEditor } from '../components/ListEditor';
import { PageHead } from '../components/ui';
import { Icon } from '../components/Icon';

const DAY = 86400000;

/** Gather what's happened since last time, and what to bring up, before a session. */
export default function Prep({ appointmentId }: { appointmentId?: string }) {
  const { me, members, parts, go, toast } = useApp();
  const tracked = members.filter((m) => m.tracked);
  const whoId = me?.tracked ? me.id : tracked[0]?.id ?? me?.id ?? '';
  const appts = useAll('appointments');
  const preps = useAll('prep').filter((p) => p.memberId === whoId);
  const allEntries = useAll('entries');
  const checkins = useAll('checkins').filter((c) => c.memberId === whoId);
  const body = useAll('body').filter((b) => b.memberId === whoId);

  // Which session: the chosen appointment, else the next therapy-like one, else "my next session".
  const appt = useMemo(() => {
    if (appointmentId) return appts.find((a) => a.id === appointmentId) ?? null;
    return appts.map((a) => ({ a, n: nextOccurrence(a) })).filter((x) => x.n != null).sort((x, y) => x.n! - y.n!)[0]?.a ?? null;
  }, [appts, appointmentId]);
  const sessionAt = useMemo(() => (appt ? nextOccurrence(appt) : null) ?? Date.now() + DAY, [appt]);
  const lastPrep = preps.filter((p) => p.sessionAt < sessionAt - 3600000).sort((a, b) => b.sessionAt - a.sessionAt)[0];
  const since = (appt && previousOccurrence(appt, sessionAt - 60000)) || lastPrep?.sessionAt || sessionAt - 14 * DAY;

  const existing = preps.find((p) => Math.abs(p.sessionAt - sessionAt) < 3600000 && p.appointmentId === (appt?.id ?? null));
  const [draft, setDraft] = useState<SessionPrep>(() => existing ?? { id: uid(), memberId: whoId, appointmentId: appt?.id ?? null, sessionAt, since, agenda: [], questions: [], wins: [], entryIds: [], afterNotes: '', createdAt: Date.now() });
  const save = (p: Partial<SessionPrep>) => { const n = { ...draft, ...p }; setDraft(n); store.put('prep', n); };

  const entries = allEntries.filter((e) => e.subjectId === whoId && e.occurredAt >= since && e.occurredAt <= sessionAt).sort((a, b) => a.occurredAt - b.occurredAt);
  const cs = checkins.filter((c) => c.at >= since);
  const sleep = body.filter((b) => b.sleepHours != null && new Date(b.date + 'T12:00').getTime() >= since);
  const avgSleep = sleep.length ? sleep.reduce((n, b) => n + b.sleepHours!, 0) / sleep.length : null;
  const topTriggers = countBy(entries, (e) => e.triggers).slice(0, 3).map(([t]) => t.toLowerCase());
  const helped = cs.filter((c) => c.helped && c.tried).map((c) => (c.tried === 'ritual' ? c.ritual ?? 'a ritual' : c.tried === 'outside' ? 'fresh air' : c.tried === 'breathe' ? 'breathing' : c.tried!));
  const pName = (id: string) => parts.find((p) => p.id === id)?.name;

  const asText = () => [
    `Session prep: ${appt ? `${appt.title || kindLabel(appt)}, ` : ''}${fmtDateTime(sessionAt)}`,
    `Since ${new Date(since).toLocaleDateString()}: ${entries.length} moments noted${topTriggers.length ? `, often ${topTriggers.join(', ')}` : ''}${entries.filter((e) => e.lostTime).length ? `; ${entries.filter((e) => e.lostTime).length} with lost time` : ''}.`,
    avgSleep != null ? `Average sleep: ${avgSleep.toFixed(1)} hours.` : '',
    helped.length ? `What helped: ${[...new Set(helped)].join(', ')}.` : '',
    draft.agenda.length ? `\nWhat I want to talk about:\n${draft.agenda.map((a) => `- ${a}`).join('\n')}` : '',
    draft.entryIds.length ? `\nMoments to discuss:\n${entries.filter((e) => draft.entryIds.includes(e.id)).map((e) => `- ${fmtDateTime(e.occurredAt)}: ${[e.triggers.join(', '), e.notes].filter(Boolean).join(' — ') || 'a moment'}`).join('\n')}` : '',
    draft.questions.length ? `\nQuestions:\n${draft.questions.map((a) => `- ${a}`).join('\n')}` : '',
    draft.wins.length ? `\nWins since last time:\n${draft.wins.map((a) => `- ${a}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  return (
    <div className="fade-in">
      <PageHead title="Prepare for my session" sub={appt ? `${appt.title || kindLabel(appt)} · ${fmtDateTime(sessionAt)}` : 'For your next appointment'} onBack={() => go({ name: 'appointments' })} />
      <div className="row no-print" style={{ marginBottom: '.8rem' }}>
        <button className="btn sm" onClick={() => window.print()}><Icon name="print" size={16} /> Print</button>
        <button className="btn sm" onClick={() => navigator.clipboard?.writeText(asText()).then(() => toast('Copied. Paste it into a message or notes.'), () => toast('Could not copy here.'))}>Copy as text</button>
      </div>

      <div className="card accent">
        <div className="eyebrow">Since {new Date(since).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
        <p style={{ margin: 0 }}><b>{entries.length}</b> moment{entries.length === 1 ? '' : 's'} noted{topTriggers.length ? <>, most often <b>{topTriggers.join(', ')}</b></> : null}.
          {entries.some((e) => e.lostTime) && <> {entries.filter((e) => e.lostTime).length} with lost time.</>}
          {cs.length > 0 && <> {cs.length} check-in{cs.length === 1 ? '' : 's'}: {(['good', 'okay', 'wobbly', 'struggling'] as const).map((f) => [f, cs.filter((c) => c.feeling === f).length] as const).filter(([, n]) => n).map(([f, n]) => `${n} ${f}`).join(', ')}.</>}
          {avgSleep != null && <> Sleep averaged {avgSleep.toFixed(1)} hours.</>}
          {helped.length > 0 && <> What helped: {[...new Set(helped)].join(', ')}.</>}</p>
      </div>

      <div className="card"><h3>What I want to talk about</h3><ListEditor id="prep-agenda" items={draft.agenda} onChange={(v) => save({ agenda: v })} placeholder="A topic, a feeling, something that happened" suggestions={['How the week went', 'A hard moment', 'Something a part wants to share', 'Medication', 'Sleep']} /></div>

      <div className="card"><h3>Moments to bring up</h3>
        {entries.length === 0 ? <p className="small muted" style={{ margin: 0 }}>No moments noted since last time.</p> : entries.map((e) => (
          <label key={e.id} className="switch" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="small"><b>{fmtDateTime(e.occurredAt)}</b>{e.location ? ` · ${e.location}` : ''}<br /><span className="muted">{[e.triggers.slice(0, 2).join(', '), e.mood ? moodLabel(e.mood) : '', e.frontingPartIds.map(pName).filter(Boolean).join(', '), e.lostTime ? 'lost time' : ''].filter(Boolean).join(' · ') || 'A moment'}</span></span>
            <input type="checkbox" role="switch" checked={draft.entryIds.includes(e.id)} onChange={(ev) => save({ entryIds: ev.target.checked ? [...draft.entryIds, e.id] : draft.entryIds.filter((x) => x !== e.id) })} />
          </label>
        ))}
      </div>

      <div className="card"><h3>Questions to ask</h3><ListEditor id="prep-questions" items={draft.questions} onChange={(v) => save({ questions: v })} placeholder="Something you'd like to understand" /></div>
      <div className="card"><h3>Wins, big or small</h3><ListEditor id="prep-wins" items={draft.wins} onChange={(v) => save({ wins: v })} placeholder="Anything that went a bit better" suggestions={['Used a grounding tool', 'Reached out to someone', 'Kept an appointment', 'Slept a bit better']} /></div>
      <div className="card"><h3>After the session</h3><p className="small muted">What do you want to remember from today?</p>
        <textarea id="prep-after" className="input" value={draft.afterNotes} onChange={(e) => save({ afterNotes: e.target.value })} placeholder="Ideas to try, homework, things that felt important" /></div>

      {preps.filter((p) => p.id !== draft.id).length > 0 && (
        <details className="no-print"><summary className="small muted">Earlier sessions ({preps.filter((p) => p.id !== draft.id).length})</summary>
          {preps.filter((p) => p.id !== draft.id).sort((a, b) => b.sessionAt - a.sessionAt).map((p) => (
            <div key={p.id} className="card soft small" style={{ marginTop: '.6rem' }}><b>{fmtDateTime(p.sessionAt)}</b>{p.agenda.length > 0 && <div>Talked about: {p.agenda.join(', ')}</div>}{p.afterNotes && <div style={{ whiteSpace: 'pre-wrap' }}>Remember: {p.afterNotes}</div>}</div>
          ))}
        </details>
      )}
    </div>
  );
}
