import { Fragment, useEffect, useState } from 'react';
import { useApp } from '../state';
import { track } from '../db';
import { HELP, HELP_GROUPS, searchHelp, type HelpBlock, type HelpTopic } from '../lib/help';
import { PageHead } from '../components/ui';
import { Icon } from '../components/Icon';

/** Render **bold** in help text. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).map((s, i) => (s.startsWith('**') ? <b key={i}>{s.slice(2, -2)}</b> : <Fragment key={i}>{s}</Fragment>))}</>;
}

function Block({ b }: { b: HelpBlock }) {
  if ('p' in b) return <p><Rich text={b.p} /></p>;
  if ('h' in b) return <h3 style={{ marginTop: '1rem' }}>{b.h}</h3>;
  if ('tip' in b) return <div className="card accent small" style={{ margin: '.8rem 0' }}><Rich text={b.tip} /></div>;
  if ('steps' in b) return <ol className="help-steps">{b.steps.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol>;
  return <ul className="help-list">{b.list.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ul>;
}

function Article({ t, onBack }: { t: HelpTopic; onBack: () => void }) {
  const { go } = useApp();
  const related = HELP.filter((x) => x.group === t.group && x.id !== t.id);
  return (
    <article className="fade-in" data-testid="help-article">
      <PageHead title={t.title} sub={t.summary} onBack={onBack} />
      <div className="card help-body">{t.body.map((b, i) => <Block key={i} b={b} />)}
        {t.open && <div className="row" style={{ flexWrap: 'wrap', marginTop: '.6rem' }}>{t.open.map((o) => <button key={o.label} className="btn sm primary" onClick={() => go(o.route)}>{o.label} <Icon name="chevron" size={14} /></button>)}</div>}
      </div>
      {related.length > 0 && <><h2>More in {t.group}</h2>
        <div className="card">{related.map((r) => <TopicRow key={r.id} t={r} />)}</div></>}
    </article>
  );
}

function TopicRow({ t }: { t: HelpTopic }) {
  const { go } = useApp();
  return (
    <button className="entry help-row" onClick={() => go({ name: 'help', topic: t.id })}>
      <span style={{ flex: 1, textAlign: 'left' }}><b>{t.title}</b><br /><span className="small muted">{t.summary}</span></span>
      <Icon name="chevron" size={16} />
    </button>
  );
}

export default function Help() {
  const { route, go, me, openTour } = useApp();
  const [q, setQ] = useState('');
  const topic = route.name === 'help' && route.topic ? HELP.find((t) => t.id === route.topic) : undefined;
  useEffect(() => { track(me?.id, 'help'); }, [me?.id]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [topic?.id]);
  if (topic) return <Article t={topic} onBack={() => go({ name: 'help' })} />;
  const results = q.trim() ? searchHelp(q) : null;
  return (
    <div className="fade-in">
      <PageHead title="Help & guides" sub="Read at your own pace. Everything here works offline." onBack={() => go({ name: 'home' })} />
      <input id="help-search" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. invite, therapist, forgot passphrase" aria-label="Search help" />
      <div className="row" style={{ margin: '.8rem 0', flexWrap: 'wrap' }}>
        <button className="btn sm" onClick={openTour}><Icon name="sparkle" size={16} /> Replay the quick tour</button>
        <button className="btn sm" onClick={() => go({ name: 'explore' })}><Icon name="star" size={16} /> Features and badges</button>
      </div>
      {results ? (
        <div className="card">{results.length ? results.map((t) => <TopicRow key={t.id} t={t} />) : <p className="muted small">Nothing found. Try another word, or send us a question below.</p>}</div>
      ) : HELP_GROUPS.map((g) => (
        <section key={g}><h2>{g}</h2><div className="card">{HELP.filter((t) => t.group === g).map((t) => <TopicRow key={t.id} t={t} />)}</div></section>
      ))}
      <div className="card warm small" style={{ marginTop: '1rem' }}>
        Still stuck? Email <a href="mailto:hello@idid.care">hello@idid.care</a> or <button className="linkish" onClick={() => go({ name: 'feedback' })}>send a question or idea</button>. For help right now, call or text <a href="tel:988">988</a>.
      </div>
    </div>
  );
}
