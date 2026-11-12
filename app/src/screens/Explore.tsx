import { factsFor, patchActivity, updateDevice, useOne } from '../db';
import { useApp } from '../state';
import { BADGES, FEATURES, emptyActivity, progress, type Feature } from '../lib/progress';
import { useAccount } from '../sync/account';
import { permission } from '../lib/notify';
import { PageHead, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

export function useProgress() {
  const { me } = useApp();
  const acct = useAccount();
  const a = useOne('activity', me?.id) ?? emptyActivity(me?.id ?? '');
  const facts = me ? factsFor(me.id, { online: acct.phase === 'connected', notifications: permission() === 'granted' }) : null;
  return { a, facts, p: facts ? progress(facts, a) : null };
}

export default function Explore() {
  const { go, settings, openTour } = useApp();
  const { a, p } = useProgress();
  if (!p) return null;
  const usedIds = new Set(p.used.map((f) => f.id));
  const groups = [...new Set(FEATURES.map((f) => f.group))];
  const pct = Math.round((p.used.length / p.total) * 100);

  return (
    <div className="fade-in">
      <PageHead title="Explore" sub="Everything IDID can do, and what you've tried so far." onBack={() => go({ name: 'home' })} />
      <div className="card accent">
        <div className="row between"><b>You've tried {p.used.length} of {p.total} features</b><span className="small">{pct}%</span></div>
        <div className="barrow" style={{ gridTemplateColumns: '1fr', margin: '.5rem 0 .2rem' }}><span className="track" style={{ height: 14, background: 'var(--surface)' }}><span className="fill" style={{ width: `${pct}%`, display: 'block' }} /></span></div>
        <p className="small" style={{ margin: '.4rem 0 0' }}>There's no right amount. Use what helps and leave the rest.</p>
        <div className="row" style={{ marginTop: '.7rem' }}>
          <button className="btn sm" onClick={openTour}><Icon name="sparkle" size={16} /> Take the quick tour</button>
          <button className="btn sm ghost" onClick={() => go({ name: 'feedback' })}>Suggest a feature</button>
        </div>
      </div>

      {settings.badges && (
        <div className="card">
          <h2>Badges <span className="small muted" style={{ fontWeight: 400 }}>{p.earned.length} of {BADGES.length}</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '.6rem' }}>
            {BADGES.map((b) => {
              const got = p.earned.some((x) => x.id === b.id);
              return (
                <div key={b.id} className="card" style={{ margin: 0, padding: '.75rem', textAlign: 'center', boxShadow: 'none', background: got ? 'var(--accent-soft)' : 'var(--surface-2)', opacity: got ? 1 : 0.75 }}
                  aria-label={`${b.name}: ${got ? 'earned' : 'not yet'}. ${b.about}`}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto .35rem', display: 'grid', placeItems: 'center', background: got ? 'var(--accent)' : 'var(--line)', color: got ? 'var(--accent-ink)' : 'var(--muted)' }}>
                    <Icon name={got ? b.icon : 'lock'} size={20} />
                  </div>
                  <b className="small">{b.name}</b>
                  <div className="tiny muted">{b.about}</div>
                  {got && a.badges[b.id] && <div className="tiny muted">{new Date(a.badges[b.id]).toLocaleDateString()}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <div key={g} className="card">
          <h2>{g}</h2>
          {FEATURES.filter((f) => f.group === g).map((f: Feature) => {
            const used = usedIds.has(f.id);
            return (
              <div key={f.id} className="row between" style={{ padding: '.5rem 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
                <span style={{ display: 'flex', gap: '.6rem', minWidth: 0 }}>
                  <span style={{ color: used ? 'var(--accent)' : 'var(--line)', flexShrink: 0 }} aria-hidden="true"><Icon name={used ? 'check' : 'plus'} size={20} /></span>
                  <span><b className="small">{f.name}</b>{used && <span className="tiny muted"> · tried</span>}<br /><span className="tiny muted">{f.about}</span></span>
                </span>
                <button className="btn sm ghost" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => (f.id === 'tour' ? openTour() : go(f.route))} aria-label={`${used ? 'Open' : 'Try'} ${f.name}`}>{used ? 'Open' : 'Try it'}</button>
              </div>
            );
          })}
        </div>
      ))}

      <div className="card soft">
        <Switch label="Show badges" hint="Celebrate milestones with a small badge" checked={settings.badges} onChange={(v) => updateDevice({ badges: v })} />
        <Switch label="Daily small act of kindness" hint="A gentle idea on Home for paying it forward" checked={settings.kindActs} onChange={(v) => updateDevice({ kindActs: v })} />
        <Switch label="Suggest features that might help" hint="At most once a week, and never something you've said no to" checked={settings.featureTips} onChange={(v) => updateDevice({ featureTips: v })} />
        {a.dismissedTips.length > 0 && <button className="btn ghost sm" onClick={() => patchActivity(a.id, { dismissedTips: [] })}>Allow dismissed suggestions again</button>}
      </div>
    </div>
  );
}
