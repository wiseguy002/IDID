import { useState } from 'react';
import { locale, t, tx } from '../i18n';
import { store, uid, useAll, useOne } from '../db';
import { useApp } from '../state';
import type { SafetyPlan as Plan, SupportContact } from '../types';
import { ListEditor } from '../components/ListEditor';
import { PageHead, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';
import { ContactForm, ContactRow, CrisisCard } from './Support';

export const planId = (memberId: string) => `safety:${memberId}`;

function blankPlan(memberId: string): Plan {
  return { id: planId(memberId), memberId, warningSigns: [], coping: [], distractions: [], helperContactIds: [], proContactIds: [], safeSteps: [], reasons: [], visibility: 'private', updatedAt: Date.now() };
}

const STEPS: { key: keyof Plan; title: string; ask: string; suggest: string[]; kind: 'list' | 'helpers' | 'pros' }[] = [
  { key: 'warningSigns', kind: 'list', title: tx('My warning signs'), ask: tx('What thoughts, feelings, situations or changes tell you a hard time might be building?'),
    suggest: [tx('Not sleeping'), tx('Pulling away from people'), tx('Losing time more often'), tx('Feeling numb or far away'), tx('Harsh inner voices'), tx('Feeling hopeless'), tx('Thoughts of hurting myself'), tx('Anniversaries or certain dates')] },
  { key: 'coping', kind: 'list', title: tx('Things I can do on my own'), ask: tx('What helps you feel even a little calmer or safer, without needing anyone else?'),
    suggest: [tx('Slow breathing'), tx('5-4-3-2-1 grounding'), tx('A warm shower'), tx('Play a favorite song'), tx('Wrap up in a blanket'), tx('Step outside for fresh air'), tx('Open my comfort kit'), tx('Hold something cold')] },
  { key: 'distractions', kind: 'list', title: tx('People and places that help me take a break'), ask: tx("Places to go, or people to be around (not necessarily to talk about how you're feeling)."),
    suggest: [tx('A walk in the park'), tx('The library'), tx('A café'), tx('Watching a show with someone'), tx('Calling a friend to chat about anything'), tx('Visiting family')] },
  { key: 'helperContactIds', kind: 'helpers', title: tx('People I can ask for help'), ask: tx('Who can you reach out to and tell that you’re struggling?'), suggest: [] },
  { key: 'proContactIds', kind: 'pros', title: tx('Professionals and services'), ask: tx('Your therapist, doctor, social worker or local crisis service. 988 and other crisis lines are always included.'), suggest: [] },
  { key: 'safeSteps', kind: 'list', title: tx('Making things safer'), ask: tx('What can you (or someone with you) do to make your surroundings safer during a crisis?'),
    suggest: [tx('Ask someone to keep medications for me'), tx('Put away anything I could use to hurt myself'), tx('Stay with someone tonight'), tx('Avoid alcohol and drugs'), tx('Go somewhere public and calm')] },
  { key: 'reasons', kind: 'list', title: tx('What matters to me'), ask: tx('People, pets, hopes, plans, small joys: things worth staying for.'), suggest: [tx('My family'), tx('My pet'), tx('My friends'), tx('Things I still want to do'), tx('Seeing the seasons change')] },
];

function ContactPicker({ ids, onChange, memberId, pro }: { ids: string[]; onChange: (v: string[]) => void; memberId: string; pro: boolean }) {
  const contacts = useAll('contacts').filter((c) => c.memberId === memberId && (pro ? ['therapist', 'psychiatrist', 'social-worker', 'counselor', 'crisis', 'doctor', 'group'].includes(c.role) : true));
  const [adding, setAdding] = useState<SupportContact | null>(null);
  return (
    <div>
      {contacts.length === 0 && <p className="small muted">{pro ? t('No professional contacts saved yet.') : t('No contacts saved yet.')}</p>}
      <div className="stack">
        {contacts.map((c) => (
          <label key={c.id} className="switch" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '.5rem .8rem' }}>
            <span><b>{c.name}</b>{c.phone && <span className="small muted"> · {c.phone}</span>}</span>
            <input type="checkbox" role="switch" checked={ids.includes(c.id)} onChange={(e) => onChange(e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id))} />
          </label>
        ))}
      </div>
      <button className="btn sm" style={{ marginTop: '.6rem' }} onClick={() => setAdding({ id: uid(), memberId, name: '', role: pro ? 'therapist' : 'other', phone: '', email: '', website: '', address: '', notes: '', pinned: true, createdAt: Date.now() })}>
        <Icon name="plus" size={15} /> {t('Add someone')}
      </button>
      {adding && <ContactForm c={adding} onClose={() => { if (store.get('contacts', adding.id)) onChange([...ids, adding.id]); setAdding(null); }} />}
    </div>
  );
}

export function SafetyPlanView({ plan, compact }: { plan: Plan; compact?: boolean }) {
  const contacts = useAll('contacts');
  const pick = (ids: string[]) => ids.map((i) => contacts.find((c) => c.id === i)).filter(Boolean) as SupportContact[];
  const Section = ({ n, title, items }: { n: number; title: string; items: string[] }) => items.length ? (
    <div className="card" style={{ marginBottom: '.7rem' }}>
      <div className="eyebrow">{t('Step {n}', { n })}</div><h3>{t(title)}</h3>
      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  ) : null;
  return (
    <div>
      <Section n={1} title="My warning signs" items={plan.warningSigns} />
      <Section n={2} title="Things I can do on my own" items={plan.coping} />
      <Section n={3} title="People and places that help me take a break" items={plan.distractions} />
      {pick(plan.helperContactIds).length > 0 && <div className="card" style={{ marginBottom: '.7rem' }}><div className="eyebrow">{t('Step {n}', { n: 4 })}</div><h3>{t('People I can ask for help')}</h3>{pick(plan.helperContactIds).map((c) => <ContactRow key={c.id} c={c} />)}</div>}
      <div className="card" style={{ marginBottom: '.7rem' }}><div className="eyebrow">{t('Step {n}', { n: 5 })}</div><h3>{t('Professionals and services')}</h3>
        {pick(plan.proContactIds).map((c) => <ContactRow key={c.id} c={c} />)}
        {!compact && <div style={{ marginTop: '.6rem' }}><CrisisCard /></div>}
      </div>
      <Section n={6} title="Making things safer" items={plan.safeSteps} />
      <Section n={7} title="What matters to me" items={plan.reasons} />
    </div>
  );
}

export default function SafetyPlanScreen() {
  const { me, members, go, toast, checkIn } = useApp();
  const tracked = members.filter((m) => m.tracked);
  const whoId = me?.tracked ? me.id : tracked[0]?.id ?? me?.id ?? '';
  const who = members.find((m) => m.id === whoId);
  const saved = useOne('safety', planId(whoId));
  const [draft, setDraft] = useState<Plan | null>(null);
  const [step, setStep] = useState(0);
  const isSelf = whoId === me?.id;

  const startEdit = () => { setDraft(saved ? { ...saved } : blankPlan(whoId)); setStep(0); };
  const save = async () => { if (!draft) return; await store.put('safety', { ...draft, updatedAt: Date.now() }); setDraft(null); toast(t('Your safety plan is saved. It’s always one tap away on Pause.')); };

  if (draft) {
    const s = STEPS[step];
    const set = (v: unknown) => setDraft({ ...draft, [s.key]: v });
    return (
      <div>
        <div className="row between" style={{ flexWrap: 'nowrap' }}>
          <div><div className="eyebrow">{t('Safety plan · step {n} of {total}', { n: step + 1, total: STEPS.length })}</div><h1>{t(s.title)}</h1></div>
          <button className="iconbtn" aria-label={t('Close without saving')} onClick={() => setDraft(null)}><Icon name="close" /></button>
        </div>
        <div className="steps" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        <p className="muted">{t(s.ask)}</p>
        <div className="fade-in" key={step}>
          {s.kind === 'list' && <ListEditor id={`sp-${s.key}`} items={draft[s.key] as string[]} onChange={set} suggestions={s.suggest.map((x) => t(x))} />}
          {s.kind !== 'list' && <ContactPicker ids={draft[s.key] as string[]} onChange={set} memberId={whoId} pro={s.kind === 'pros'} />}
          {step === STEPS.length - 1 && (
            <div className="card soft" style={{ marginTop: '1rem' }}>
              <div className="eyebrow">{t('Who can see this plan')}</div>
              <Segmented label={t('Who can see this plan')} value={draft.visibility} onChange={(v) => setDraft({ ...draft, visibility: v })}
                options={[{ value: 'private', label: t('Only me') }, { value: 'circle', label: t('My trust circle') }]} />
              <p className="tiny muted" style={{ margin: '.5rem 0 0' }}>{t('Sharing it lets the people who support you know your warning signs and how to help.')}</p>
            </div>
          )}
        </div>
        <div style={{ height: '5rem' }} />
        <div className="wizard-foot"><div>
          {step > 0 ? <button className="btn" onClick={() => setStep(step - 1)}>{t('Back')}</button> : <button className="btn" onClick={save}>{t('Save now')}</button>}
          {step < STEPS.length - 1 ? <button className="btn primary" onClick={() => setStep(step + 1)}>{t('Next')}</button> : <button className="btn primary" onClick={save}><Icon name="check" size={18} /> {t('Save plan')}</button>}
        </div></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHead title={isSelf ? t('My safety plan') : t("{name}'s safety plan", { name: who?.name ?? '' })} sub={t('What to do when things get hard, written while things are calmer.')} onBack={() => go({ name: 'pause' })}
        right={saved ? <button className="btn sm" onClick={startEdit}><Icon name="edit" size={16} /> {t('Edit')}</button> : undefined} />
      {!saved ? (
        <div className="card accent">
          <h3>{t('Make a plan, gently')}</h3>
          <p className="small">{t("A safety plan is a short, personal list you write while you're calmer: your warning signs, what helps, who to reach out to, and what matters to you. It's one of the most helpful tools for getting through a crisis. Seven short steps, all optional, and you can change it any time.")}</p>
          <button className="btn primary" onClick={startEdit}>{t('Start my safety plan')}</button>
        </div>
      ) : (
        <>
          <div className="row" style={{ marginBottom: '.8rem' }}>
            <button className="btn sm primary" onClick={() => go({ name: 'pause' })}><Icon name="leaf" size={16} /> {t('Breathing & grounding')}</button>
            <button className="btn sm" onClick={checkIn}>{t('Check in with myself')}</button>
            <button className="btn sm no-print" onClick={() => window.print()}><Icon name="print" size={16} /> {t('Print')}</button>
          </div>
          <SafetyPlanView plan={saved} />
          <p className="tiny muted">{saved.visibility === 'circle' ? t('Shared with your trust circle.') : t('Only you can see this plan.')} {t('Updated {date}.', { date: new Date(saved.updatedAt).toLocaleDateString(locale()) })}</p>
        </>
      )}
      {!saved && <div style={{ marginTop: '1rem' }}><CrisisCard /></div>}
    </div>
  );
}
