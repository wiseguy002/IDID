import { useEffect, useMemo, useState, useCallback } from 'react';
import { persist, store, updateDevice, useAll, useSettings } from './db';
import { hasVault } from './data/vault';
import { Ctx, type Route } from './state';
import { Icon } from './components/Icon';
import Onboarding from './screens/Onboarding';
import Lock from './screens/Lock';
import WhoIsHere from './screens/WhoIsHere';
import Home from './screens/Home';
import LogEntry from './screens/LogEntry';
import Timeline from './screens/Timeline';
import EntryDetail from './screens/EntryDetail';
import Observe from './screens/Observe';
import Insights from './screens/Insights';
import Circle from './screens/Circle';
import Share from './screens/Share';
import SettingsScreen from './screens/Settings';
import Pause from './screens/Pause';
import Appointments from './screens/Appointments';
import Account, { pendingInvite } from './screens/Account';
import Support from './screens/Support';
import { lockAccount, resume } from './sync/account';
import { useReminders } from './lib/useReminders';

const NAV: { name: Route['name']; label: string; icon: string }[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'timeline', label: 'Timeline', icon: 'list' },
  { name: 'log', label: 'Log', icon: 'plus' },
  { name: 'insights', label: 'Patterns', icon: 'chart' },
  { name: 'circle', label: 'Circle', icon: 'people' },
];

export default function App() {
  const settings = useSettings();
  const rawMembers = useAll('members');
  const rawParts = useAll('parts');
  const members = useMemo(() => [...rawMembers].sort((a, b) => a.createdAt - b.createdAt), [rawMembers]);
  const parts = useMemo(() => [...rawParts].sort((a, b) => a.createdAt - b.createdAt), [rawParts]);
  const [vault, setVault] = useState<boolean | null>(null);
  const unlocked = store.unlocked;
  const [chosen, setChosen] = useState(false);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // Snapshot of last-opened time before we update it, so Home can say "welcome back".
  const [prevOpened, setPrevOpened] = useState<number | null | undefined>(undefined);

  useEffect(() => { hasVault(persist).then(setVault).catch(() => setVault(false)); }, []);

  // Auto-lock: clear decrypted data from memory after time in the background.
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && store.unlocked && Date.now() - hiddenAt >= settings.autoLockMins * 60000) { store.lock(); setChosen(false); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [settings.autoLockMins]);

  useEffect(() => {
    const h = document.documentElement;
    h.dataset.theme = settings.theme;
    h.dataset.text = settings.textSize;
    h.dataset.motion = settings.reduceMotion ? 'reduce' : 'full';
    h.dataset.readable = String(settings.readableFont);
    h.dataset.soft = String(settings.softEdges);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', getComputedStyle(h).getPropertyValue('--bg').trim() || '#f5efe6');
  }, [settings]);

  useEffect(() => {
    if (unlocked && prevOpened === undefined) {
      setPrevOpened(settings.lastOpenedAt);
      updateDevice({ lastOpenedAt: Date.now() });
    }
  }, [unlocked, settings.lastOpenedAt, prevOpened]);

  const go = useCallback((r: Route) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);
  const toast = useCallback((m: string) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const me = useMemo(() => members.find((m) => m.id === settings.activeMemberId) ?? members[0] ?? null, [members, settings.activeMemberId]);

  // Start or stop the online circle along with the lock.
  useEffect(() => {
    if (unlocked) {
      resume().catch(() => undefined);
      if (pendingInvite()) setRoute({ name: 'account' });
    } else {
      lockAccount();
      setChosen(false); // on a shared device, ask who's here again after unlocking
    }
  }, [unlocked]);

  useReminders(unlocked ? me : null, { appointments: settings.notifyAppointments, checkInTime: settings.checkInTime }, toast);

  if (vault === null) return null;
  if (!vault || (unlocked && members.length === 0)) return <Onboarding onDone={() => { setVault(true); setChosen(true); }} />;
  if (!unlocked) return <Lock onUnlock={() => undefined} />;
  if (members.length > 1 && !chosen) {
    return <WhoIsHere members={members} current={me?.id ?? null} onPick={(id) => { updateDevice({ activeMemberId: id }); setRoute({ name: 'home' }); setChosen(true); }} />;
  }

  const ctx = { settings, members, parts, me, route, go, toast };
  const inWizard = route.name === 'log' || route.name === 'observe';

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        <header className="topbar no-print">
          <div className="brand">
            <span className="brand-mark"><Icon name="leaf" size={17} /></span>
            {settings.circleName || 'IDID'}
          </div>
          <button className="btn sm ghost" onClick={() => go({ name: 'pause' })} aria-label="Take a pause: grounding tools">
            <Icon name="heart" size={18} /> Pause
          </button>
          {members.length > 1 && (
            <button className="iconbtn" onClick={() => setChosen(false)} aria-label={`Switch person (currently ${me?.name})`} title={`Using as ${me?.name}`}>
              <span className="brand-mark" style={{ background: me?.color, color: '#fff', fontSize: '.8rem', fontWeight: 700 }}>{me?.name.charAt(0)}</span>
            </button>
          )}
          <button className="iconbtn" onClick={() => go({ name: 'settings' })} aria-label="Settings"><Icon name="gear" /></button>
        </header>
        <main>
          {route.name === 'home' && <Home prevOpened={prevOpened ?? null} />}
          {route.name === 'log' && <LogEntry entryId={route.entryId} />}
          {route.name === 'timeline' && <Timeline />}
          {route.name === 'entry' && <EntryDetail id={route.id} />}
          {route.name === 'observe' && <Observe id={route.id} />}
          {route.name === 'insights' && <Insights />}
          {route.name === 'circle' && <Circle />}
          {route.name === 'share' && <Share />}
          {route.name === 'settings' && <SettingsScreen />}
          {route.name === 'pause' && <Pause />}
          {route.name === 'appointments' && <Appointments />}
          {route.name === 'account' && <Account />}
          {route.name === 'support' && <Support />}
        </main>
        {!inWizard && (
          <nav className="bottomnav no-print" aria-label="Main">
            <div className="bottomnav-inner">
              {NAV.map((n) => (
                <button key={n.name} className={`navbtn ${n.name === 'log' ? 'log' : ''}`} aria-current={route.name === n.name ? 'page' : undefined}
                  onClick={() => go({ name: n.name } as Route)}>
                  <span className="navicon"><Icon name={n.icon} size={n.name === 'log' ? 24 : 22} /></span>
                  {n.label}
                </button>
              ))}
            </div>
          </nav>
        )}
        {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
      </div>
    </Ctx.Provider>
  );
}
