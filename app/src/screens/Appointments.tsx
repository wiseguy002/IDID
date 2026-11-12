import { useMemo, useState } from 'react';
import { store, uid, useAll } from '../db';
import { canSee, useApp } from '../state';
import { calendarTitle, googleCalendarUrl, kindLabel, leadLabel, nextOccurrence, previousOccurrence, recurrenceLabel, toIcs } from '../lib/schedule';
import { countBy, download, fmtDateTime, toLocalInput } from '../lib/util';
import { APPOINTMENT_KINDS, type Appointment, type AppointmentKind, type Recurrence } from '../types';
import { ChipSelect, Empty, PageHead, Segmented, Sheet, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

const LEADS = [15, 60, 1440, 2880];

function blank(createdBy: string, memberIds: string[]): Appointment {
  const d = new Date(Date.now() + 86400000);
  d.setMinutes(0, 0, 0);
  return { id: uid(), title: '', kind: 'therapy', startsAt: d.getTime(), durationMin: 50, location: '', notes: '', recurrence: 'weekly', until: null, reminderMins: [60, 1440], memberIds, createdBy, createdAt: Date.now() };
}

function AppointmentForm({ a, onClose }: { a: Appointment; onClose: () => void }) {
  const { members, toast } = useApp();
  const [x, setX] = useState(a);
  const isNew = !store.get('appointments', a.id);
  const set = <K extends keyof Appointment>(k: K, v: Appointment[K]) => setX((p) => ({ ...p, [k]: v }));
  const save = async () => {
    await store.put('appointments', { ...x, title: x.title.trim() });
    toast(isNew ? 'Appointment added.' : 'Saved.');
    onClose();
  };
  return (
    <Sheet title={isNew ? 'New appointment' : 'Edit appointment'} onClose={onClose}>
      <div className="eyebrow">Type</div>
      <ChipSelect multi={false} value={[x.kind]} onChange={(v) => v[0] && set('kind', v[0] as AppointmentKind)} options={APPOINTMENT_KINDS} />
      <label className="field" style={{ marginTop: '.8rem' }}><span>Name <span className="muted small">(only shown inside IDID)</span></span>
        <input id="ap-title" className="input" value={x.title} onChange={(e) => set('title', e.target.value)} placeholder={`e.g. ${kindLabel(x)} with Dr. Lee, Tuesday group`} /></label>
      <div className="grid2">
        <label className="field"><span>Starts</span><input id="ap-start" className="input" type="datetime-local" value={toLocalInput(x.startsAt)} onChange={(e) => e.target.value && set('startsAt', new Date(e.target.value).getTime())} /></label>
        <label className="field"><span>Length (minutes)</span><input id="ap-dur" className="input" type="number" min={5} step={5} value={x.durationMin} onChange={(e) => set('durationMin', Math.max(5, Number(e.target.value) || 50))} /></label>
      </div>
      <label className="field"><span>Where</span><input id="ap-loc" className="input" value={x.location} onChange={(e) => set('location', e.target.value)} placeholder="Address, room, or video link" /></label>
      <div className="eyebrow">Repeats</div>
      <Segmented label="Repeats" value={x.recurrence} onChange={(v: Recurrence) => set('recurrence', v)}
        options={[{ value: 'none', label: 'Once' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: '2 weeks' }, { value: 'monthly', label: 'Monthly' }]} />
      {x.recurrence !== 'none' && (
        <label className="field" style={{ marginTop: '.6rem' }}><span>Until <span className="muted small">(optional)</span></span>
          <input id="ap-until" className="input" type="date" value={x.until ? new Date(x.until).toISOString().slice(0, 10) : ''} onChange={(e) => set('until', e.target.value ? new Date(e.target.value + 'T23:59').getTime() : null)} /></label>
      )}
      <div className="eyebrow" style={{ marginTop: '.8rem' }}>Remind</div>
      <ChipSelect value={x.reminderMins.map(String)} onChange={(v) => set('reminderMins', v.map(Number).sort((p, q) => p - q))} options={LEADS.map((m) => ({ value: String(m), label: leadLabel(m) }))} />
      {members.length > 1 && (
        <>
          <div className="eyebrow" style={{ marginTop: '.8rem' }}>Who it's for</div>
          <p className="tiny muted" style={{ marginTop: 0 }}>These people get the reminders.</p>
          <ChipSelect value={x.memberIds} onChange={(v) => set('memberIds', v)} options={members.map((m) => ({ value: m.id, label: m.name, color: m.color }))} />
        </>
      )}
      <label className="field" style={{ marginTop: '.8rem' }}><span>Notes</span><textarea id="ap-notes" className="input" value={x.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Things to bring up, travel plans, who's driving…" /></label>
      <div className="row">
        <button className="btn primary" onClick={save}>Save</button>
        {!isNew && <button className="btn ghost danger" onClick={async () => { await store.remove('appointments', a.id); toast('Appointment removed.'); onClose(); }}>Remove</button>}
      </div>
    </Sheet>
  );
}

function CalendarSheet({ a, onClose }: { a: Appointment; onClose: () => void }) {
  const { toast } = useApp();
  const [neutralTitle, setNeutral] = useState(true);
  const [includeNotes, setNotes] = useState(false);
  const o = { neutralTitle, includeNotes };
  return (
    <Sheet title="Add to your calendar" onClose={onClose}>
      <p className="small muted">Calendars aren't encrypted by IDID and other people or apps may see them. Choose what to share.</p>
      <Switch label="Use a neutral title" hint={`Shows as "${calendarTitle(a, { neutralTitle: true, includeNotes })}" instead of "${a.title || kindLabel(a)}"`} checked={neutralTitle} onChange={setNeutral} />
      <Switch label="Include my notes" checked={includeNotes} onChange={setNotes} />
      <div className="stack" style={{ marginTop: '.6rem' }}>
        <button className="btn block primary" onClick={() => { download('appointment.ics', toIcs(a, o), 'text/calendar'); toast('Calendar file saved. Open it to add the event.'); }}>
          <Icon name="download" size={18} /> Apple, Outlook or other calendar (.ics)
        </button>
        <a className="btn block" href={googleCalendarUrl(a, o)} target="_blank" rel="noopener noreferrer"><Icon name="share" size={18} /> Google Calendar</a>
      </div>
      <p className="tiny muted" style={{ marginTop: '.8rem' }}>Repeating appointments and reminders are included. If you change the appointment later, add it to your calendar again.</p>
    </Sheet>
  );
}

export function useUpcoming(limitDays = 400) {
  const { me } = useApp();
  const all = useAll('appointments');
  return useMemo(() => all
    .filter((a) => !a.memberIds.length || !me || a.memberIds.includes(me.id) || a.createdBy === me.id)
    .map((a) => ({ a, next: nextOccurrence(a) }))
    .filter((x): x is { a: Appointment; next: number } => x.next != null && x.next < Date.now() + limitDays * 86400000)
    .sort((x, y) => x.next - y.next), [all, me]);
}

export default function Appointments() {
  const { me, members, go } = useApp();
  const upcoming = useUpcoming();
  const all = useAll('appointments');
  const entries = useAll('entries');
  const [edit, setEdit] = useState<Appointment | null>(null);
  const [cal, setCal] = useState<Appointment | null>(null);
  const past = all.filter((a) => !upcoming.some((u) => u.a.id === a.id));
  const mName = (id: string) => members.find((m) => m.id === id)?.name;

  const sinceLast = (a: Appointment) => {
    const prev = previousOccurrence(a);
    if (!prev) return null;
    const es = entries.filter((e) => e.occurredAt > prev && canSee(me, e));
    if (!es.length) return null;
    const top = countBy(es, (e) => e.triggers).slice(0, 2).map(([t]) => t.toLowerCase());
    return `Since last time: ${es.length} moment${es.length === 1 ? '' : 's'} noted${top.length ? `, often ${top.join(' and ')}` : ''}.`;
  };

  return (
    <div className="fade-in">
      <PageHead title="Appointments" sub="Therapy, counselling, groups and other support." onBack={() => go({ name: 'home' })}
        right={<button className="btn sm primary" onClick={() => me && setEdit(blank(me.id, [me.tracked ? me.id : members.find((m) => m.tracked)?.id ?? me.id]))}><Icon name="plus" size={17} /> Add</button>} />
      {upcoming.length === 0 && <Empty title="No appointments yet">Add sessions and groups to get gentle reminders and keep track of what to bring up.</Empty>}
      {upcoming.map(({ a, next }) => {
        const prep = sinceLast(a);
        return (
          <div key={a.id} className="card">
            <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <span className="tag">{kindLabel(a)}</span>
                <h3 style={{ margin: '.35rem 0 .1rem' }}>{a.title || kindLabel(a)}</h3>
                <div className="small"><Icon name="clock" size={14} /> {fmtDateTime(next)} · {a.durationMin} min</div>
                <div className="small muted">{[a.location, recurrenceLabel(a.recurrence), a.memberIds.length && members.length > 1 ? `for ${a.memberIds.map(mName).filter(Boolean).join(', ')}` : ''].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="iconbtn" aria-label="Edit appointment" onClick={() => setEdit(a)}><Icon name="edit" /></button>
            </div>
            {prep && <div className="card soft small" style={{ margin: '.7rem 0 0', padding: '.7rem .8rem' }}>{prep} <button className="btn ghost sm" onClick={() => go({ name: 'share' })}>Open summary</button></div>}
            {a.reminderMins.length > 0 && <div className="tiny muted" style={{ marginTop: '.5rem' }}><Icon name="bell" size={13} /> {a.reminderMins.map(leadLabel).join(', ')}</div>}
            <div className="row" style={{ marginTop: '.6rem' }}>
              <button className="btn sm" onClick={() => setCal(a)}><Icon name="share" size={16} /> Add to calendar</button>
            </div>
          </div>
        );
      })}
      {past.length > 0 && (
        <details style={{ marginTop: '1rem' }}>
          <summary className="small muted">Past and finished ({past.length})</summary>
          {past.map((a) => <button key={a.id} className="card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: '.6rem' }} onClick={() => setEdit(a)}>{a.title || kindLabel(a)} <span className="muted small">· {fmtDateTime(a.startsAt)}</span></button>)}
        </details>
      )}
      {edit && <AppointmentForm a={edit} onClose={() => setEdit(null)} />}
      {cal && <CalendarSheet a={cal} onClose={() => setCal(null)} />}
    </div>
  );
}
