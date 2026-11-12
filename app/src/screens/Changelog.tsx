import { useEffect } from 'react';
import { track } from '../db';
import { useApp } from '../state';
import { APP_VERSION, BUILD_COMMIT, BUILD_DATE, RELEASES } from '../version';
import { boldSegments } from '../lib/changelog';
import { PageHead } from '../components/ui';

const SECTION_LABEL: Record<string, string> = {
  Added: 'New', Changed: 'Changed', Fixed: 'Fixed', Security: 'Privacy & security', Removed: 'Removed', Deprecated: 'Going away',
};

export function ReleaseNotes({ r, current }: { r: (typeof RELEASES)[number]; current?: boolean }) {
  return (
    <article className="card" aria-labelledby={`v-${r.version}`}>
      <div className="row between">
        <h2 id={`v-${r.version}`} style={{ margin: 0 }}>Version {r.version}</h2>
        <span className="row" style={{ gap: '.4rem' }}>
          {current && <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--ink)' }}>You have this</span>}
          {r.date && <span className="small muted">{new Date(r.date + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
        </span>
      </div>
      {r.summary && <p style={{ margin: '.35rem 0 .2rem' }}>{r.summary}</p>}
      {r.sections.map((s) => (
        <div key={s.title}>
          <div className="eyebrow" style={{ marginTop: '.7rem' }}>{SECTION_LABEL[s.title] ?? s.title}</div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {s.items.map((it, i) => <li key={i} className="small" style={{ margin: '.2rem 0' }}>{boldSegments(it).map((g, j) => (g.bold ? <b key={j}>{g.text}</b> : <span key={j}>{g.text}</span>))}</li>)}
          </ul>
        </div>
      ))}
    </article>
  );
}

export default function Changelog() {
  const { go, me } = useApp();
  useEffect(() => { track(me?.id, 'whats-new'); }, [me?.id]);
  return (
    <div className="fade-in">
      <PageHead title="What's new" sub={`You're using iDID ${APP_VERSION}.`} onBack={() => go({ name: 'settings' })} />
      <div className="card soft small">
        <b>How version numbers work.</b> Versions look like <b>1.4.2</b>. The last number goes up for fixes, the middle number for new features, and the first number for big changes that might ask something of you. While the first number is 0, iDID is in early release.
      </div>
      {RELEASES.map((r) => <ReleaseNotes key={r.version} r={r} current={r.version === APP_VERSION} />)}
      <p className="tiny muted">Build {BUILD_COMMIT}{BUILD_DATE ? ` · ${BUILD_DATE}` : ''}. The full history is in CHANGELOG.md in the project's repository.</p>
    </div>
  );
}
