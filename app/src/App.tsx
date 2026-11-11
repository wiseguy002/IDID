import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, updateSettings } from './db';
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

const NAV: { name: Route['name']; label: string; icon: string }[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'timeline', label: 'Timeline', icon: 'list' },
  { name: 'log', label: 'Log', icon: 'plus' },
  { name: 'insights', label: 'Patterns', icon: 'chart' },
  { name: 'circle', label: 'Circle', icon: 'people' },
];

export default function App() {
  const settings = useLiveQuery(() => getSettings(), []);
  const members = useLiveQuery(() => db.members.toArray().then((m) => m.sort((a, b) => a.createdAt - b.createdAt)), []);
  const parts = useLiveQuery(() => db.parts.toArray().then((p) => p.sort((a, b) => a.createdAt - b.createdAt)), []);
  const [unlocked, setUnlocked] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // Snapshot of last-opened time before we update it, so Home can say "welcome back".
  const [prevOpened, setPrevOpened] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!settings) return;
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
    if (settings && prevOpened === undefined) {
      setPrevOpened(settings.lastOpenedAt);
      if (settings.onboarded) updateSettings({ lastOpenedAt: Date.now() });
    }
  }, [settings, prevOpened]);

  const go = useCallback((r: Route) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);
  const toast = useCallback((m: string) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const me = useMemo(() => members?.find((m) => m.id === settings?.activeMemberId) ?? members?.[0] ?? null, [members, settings]);

  if (!settings || !members || !parts) return null;
  if (!settings.onboarded) return <Onboarding onDone={() => setChosen(true)} />;
  if (settings.pinHash && !unlocked) return <Lock settings={settings} onUnlock={() => setUnlocked(true)} />;
  if (members.length > 1 && !chosen) {
    return <WhoIsHere members={members} current={me?.id ?? null} onPick={async (id) => { await updateSettings({ activeMemberId: id }); setRoute({ name: 'home' }); setChosen(true); }} />;
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
