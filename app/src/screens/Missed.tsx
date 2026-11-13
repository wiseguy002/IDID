import { useEffect, useMemo, useState } from 'react';
import { locale, t, tx } from '../i18n';
import type { CheckInFeeling } from '../types';
import { useAll } from '../db';
import { useApp } from '../state';
import { track } from '../db';
import { fmtDateTime, fmtTime, moodLabel, partWords, relTime, toLocalInput } from '../lib/util';
import { kindLabel } from '../lib/schedule';
import { sinceTime, whatIMissed, type SinceChoice } from '../lib/missed';
import { PageHead } from '../components/ui';
import { Icon } from '../components/Icon';

const FEELING: Record<CheckInFeeling, string> = { good: tx('feeling good'), okay: tx('feeling okay'), wobbly: tx('feeling a bit wobbly'), struggling: tx('struggling') };

const CHOICES: { value: SinceChoice; label: string }[] = [
  { value: 'opened', label: tx('Since I last opened iDID') },
  { value: '3h', label: tx('Last 3 hours') },
  { value: 'today', label: tx('Today') },
  { value: 'yesterday', label: tx('Since yesterday') },
  { value: 'week', label: tx('Last 7 days') },
  { value: 'custom', label: tx('Pick a time') },
];

/** After lost time: ground in the present, then gently show what happened in iDID during the gap. */
export default function Missed({ prevOpened }: { prevOpened: number | null }) {
  const { me, members, parts, settings, go } = useApp();
  const w = partWords(settings.partWord);
  const owner = me?.tracked ? me : members.find((m) => m.tracked) ?? me;
  const [choice, setChoice] = useState<SinceChoice>(prevOpened ? 'opened' : 'today');
  const [custom, setCustom] = useState<number | null>(null);
  const now = Date.now();
  const since = sinceTime(choice, now, prevOpened, custom);
  const data = {
    entries: useAll('entries'), fronts: useAll('fronts'), board: useAll('board'), appointments: useAll('appointments'),
    observations: useAll('observations'), checkins: useAll('checkins'), voice: useAll('voice'),
  };
  const m = useMemo(() => whatIMissed({ memberId: owner?.id ?? '', ...data }, since, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [owner?.id, since, data.entries, data.fronts, data.board, data.appointments, data.observations, data.checkins, data.voice]);
  const pName = (id: string) => parts.find((p) => p.id === id)?.name ?? t('a {one}', { one: w.one });
  const mName = (id: string) => members.find((x) => x.id === id)?.name ?? t('Someone');
  const d = new Date(now);
  useEffect(() => { track(me?.id, 'missed'); }, [me?.id]);

  return (
    <div className="fade-in">
      <PageHead title={t('What did I miss?')} sub={t('For after lost time. Take it slowly.')} onBack={() => go({ name: 'home' })} />

      <div className="card accent">
        <div className="eyebrow"><Icon name="sun" size={14} /> {t('Right now')}</div>
        <p className="ground-now">{d.toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <p style={{ margin: 0 }}>{t("It's {time}. You're here, reading this. Feel your feet on the floor, and notice three things you can see.", { time: fmtTime(now) })}</p>
        <div className="row" style={{ marginTop: '.6rem' }}>
          <button className="btn sm" onClick={() => go({ name: 'calm' })}>{t('A calming exercise first')}</button>
          {owner?.tracked && <button className="btn sm" onClick={() => go({ name: 'front' })}>{t("Note who's here")}</button>}
        </div>
      </div>

      <div className="card">
        <label className="field"><span>{t('Since when?')}</span>
          <select className="input" value={choice} onChange={(e) => setChoice(e.target.value as SinceChoice)}>
            {CHOICES.filter((c) => c.value !== 'opened' || prevOpened).map((c) => <option key={c.value} value={c.value}>{t(c.label)}</option>)}
          </select></label>
        {choice === 'custom' && <label className="field"><span>{t('The last time you remember')}</span>
          <input className="input" type="datetime-local" value={toLocalInput(custom ?? now - 6 * 3600_000)} max={toLocalInput(now)} onChange={(e) => setCustom(new Date(e.target.value).getTime())} /></label>}
        <p className="small muted" style={{ margin: 0 }}>{t("Showing what happened in iDID since {when}. Life outside iDID won't show here, and that's okay.", { when: fmtDateTime(since) })}</p>
      </div>

      {m.empty && <div className="card soft"><p style={{ margin: 0 }}>{t("Nothing was added to iDID in that time. If you're unsure what happened, it's okay to ask someone you trust, or write down what you do remember.")}</p>
        <button className="btn sm" style={{ marginTop: '.6rem' }} onClick={() => go({ name: 'log' })}>{t('Write what I remember')}</button></div>}

      {m.fronts.length > 0 && <Section icon="people" title={t('Who was around')}>
        {m.fronts.map((f) => <li key={f.id}>{fmtDateTime(f.at)}: <b>{f.unknown ? t('not sure who') : f.partIds.map(pName).join(t(' and '))}</b>{f.blurry ? t(', feeling blurry') : ''}{f.note ? ` · ${f.note}` : ''}</li>)}
      </Section>}

      {m.entries.length > 0 && <Section icon="note" title={t('Moments noted')}>
        {m.entries.map((e) => <li key={e.id}><button className="linkish" onClick={() => go({ name: 'entry', id: e.id })}>{fmtDateTime(e.occurredAt)}</button>{e.location ? ` · ${e.location}` : ''}{e.mood ? ` · ${t(moodLabel(e.mood)).toLowerCase()}` : ''}{e.authorId !== owner?.id ? ` · ${t('noted by {name}', { name: mName(e.authorId) })}` : ''}</li>)}
      </Section>}

      {m.board.length > 0 && <Section icon="board" title={t('Notes on the inner board')} action={<button className="btn ghost sm" onClick={() => go({ name: 'board' })}>{t('Open')}</button>}>
        {m.board.map((n) => <li key={n.id}><span className="muted">{n.fromPartId ? pName(n.fromPartId) : t('Someone')}, {relTime(n.createdAt)}:</span> {n.text.length > 160 ? n.text.slice(0, 160) + '…' : n.text}</li>)}
      </Section>}

      {m.voice.length > 0 && <Section icon="mic" title={t('Voice notes recorded')} action={<button className="btn ghost sm" onClick={() => go({ name: 'voice' })}>{t('Listen')}</button>}>
        {m.voice.map((v) => <li key={v.id}>{fmtDateTime(v.createdAt)}{v.title ? `: ${v.title}` : ''}{v.partId ? ` (${pName(v.partId)})` : ''}</li>)}
      </Section>}

      {m.observations.length > 0 && <Section icon="people" title={t('Your circle added')}>
        {m.observations.map((o) => <li key={o.id}><b>{mName(o.memberId)}</b> {t('added a note {when}', { when: relTime(o.respondedAt ?? o.requestedAt) })}: {o.text || o.noticed.join(', ')}</li>)}
      </Section>}

      {m.checkins.length > 0 && <Section icon="sparkle" title={t('Check-ins')}>
        {m.checkins.map((c) => <li key={c.id}>{fmtDateTime(c.at)}: {t(FEELING[c.feeling])}{c.helped ? t(', and something helped') : ''}</li>)}
      </Section>}

      {m.past.length > 0 && <Section icon="clock" title={t('Appointments during that time')} action={<button className="btn ghost sm" onClick={() => go({ name: 'appointments' })}>{t('Open')}</button>}>
        {m.past.map(([a, at]) => <li key={a.id + at}>{a.title || t(kindLabel(a))}, {fmtDateTime(at)}. {t("If you're not sure whether it happened, it's okay to call and ask.")}</li>)}
      </Section>}

      {m.upcoming.length > 0 && <Section icon="bell" title={t('Coming up in the next two days')}>
        {m.upcoming.map(([a, at]) => <li key={a.id + at}>{a.title || t(kindLabel(a))}, {fmtDateTime(at)}{a.location ? ` · ${a.location}` : ''}</li>)}
      </Section>}

      <div className="card soft">
        <p className="small" style={{ margin: 0 }}>{t("Losing time can feel frightening. It's a common part of dissociation, and you're not alone. If you feel unsafe, open your safety plan, or call or text 988.")} <button className="linkish" onClick={() => go({ name: 'safety' })}>{t('Open my safety plan')}</button></p>
      </div>
    </div>
  );
}

function Section({ icon, title, action, children }: { icon: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="row between"><div className="eyebrow" style={{ margin: 0 }}><Icon name={icon} size={14} /> {title}</div>{action}</div>
      <ul className="small" style={{ margin: '.4rem 0 0', paddingLeft: '1.1rem' }}>{children}</ul>
    </div>
  );
}
