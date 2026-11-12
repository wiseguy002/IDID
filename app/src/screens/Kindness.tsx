import { useEffect, useState } from 'react';
import { track } from '../db';
import { useApp } from '../state';
import { KIND_ICONS, KIND_MESSAGES, kindActFor, todayKey, type KindIcon } from '../lib/kindness';
import { communityAvailable, getReceiveKindNotes, markKindNotesRead, myKindNotes, sendKindNote, setReceiveKindNotes, type KindNote } from '../sync/community';
import { relTime } from '../lib/util';
import { PageHead, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

const DONE_KEY = 'idid.kindact.done';
export const kindActDoneToday = () => { try { return localStorage.getItem(DONE_KEY) === todayKey(); } catch { return false; } };
const markKindActDone = () => { try { localStorage.setItem(DONE_KEY, todayKey()); } catch { /* ignore */ } };

/** Today's small act of kindness (also shown on Home). */
export function KindActCard({ compact }: { compact?: boolean }) {
  const { me, toast, go } = useApp();
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(kindActDoneToday);
  const act = kindActFor(new Date(), offset);
  return (
    <div className="card warm">
      <div className="eyebrow"><Icon name="sun" size={14} /> Pay it forward today</div>
      {done ? (
        <p style={{ margin: 0 }}>You did something kind today. Small acts ripple further than we can see. Thank you.</p>
      ) : (
        <>
          <p style={{ margin: '0 0 .6rem', fontSize: '1.05rem' }}>{act}</p>
          <div className="row">
            <button className="btn sm primary" onClick={() => { track(me?.id, 'kind-act'); markKindActDone(); setDone(true); toast('That’s lovely. Thank you for spreading a little kindness.'); }}>I did it</button>
            <button className="btn sm ghost" onClick={() => setOffset(offset + 1)}>Another idea</button>
            {compact && <button className="btn sm ghost" onClick={() => go({ name: 'kindness' })}>More kindness</button>}
          </div>
          <p className="tiny muted" style={{ margin: '.5rem 0 0' }}>Only if it feels okay today. Being kind to yourself counts too.</p>
        </>
      )}
    </div>
  );
}

export function useKindNotes() {
  const [notes, setNotes] = useState<KindNote[]>([]);
  useEffect(() => {
    if (!communityAvailable()) return;
    let on = true;
    const load = () => myKindNotes().then((n) => on && setNotes(n)).catch(() => undefined);
    load();
    const iv = setInterval(load, 120000);
    return () => { on = false; clearInterval(iv); };
  }, []);
  return [notes, setNotes] as const;
}

export function KindNoteView({ n }: { n: KindNote }) {
  return (
    <div className="row" style={{ gap: '.8rem', flexWrap: 'nowrap', padding: '.45rem 0' }}>
      <span className="brand-mark" style={{ width: 40, height: 40, flexShrink: 0, background: 'var(--warm-soft)', color: 'var(--warm)' }}><Icon name={n.icon} size={20} /></span>
      <span><span style={{ fontSize: '1.02rem' }}>{KIND_MESSAGES[n.message_id] ?? 'Someone is thinking of you.'}</span><br /><span className="tiny muted">From someone using iDID · {relTime(new Date(n.created_at).getTime())}</span></span>
    </div>
  );
}

export default function Kindness() {
  const { me, go, toast } = useApp();
  const online = communityAvailable();
  const [notes, setNotes] = useKindNotes();
  const [receive, setReceive] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<number | null>(null);
  const [icon, setIcon] = useState<KindIcon>('sun');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<'yes' | 'nobody' | null>(null);

  useEffect(() => { if (online) getReceiveKindNotes().then(setReceive).catch(() => undefined); }, [online]);
  useEffect(() => {
    const unread = notes.filter((n) => !n.read_at);
    if (unread.length) {
      track(me?.id, 'kind-received');
      markKindNotesRead(unread.map((n) => n.id)).then(() => setNotes(notes.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))).catch(() => undefined);
    }
  }, [notes]); // eslint-disable-line

  const send = async () => {
    if (msg == null) return;
    setBusy(true);
    try {
      const ok = await sendKindNote(msg, icon);
      setSent(ok ? 'yes' : 'nobody');
      if (ok) track(me?.id, 'kind-sent');
      setMsg(null);
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not send right now.'); }
    setBusy(false);
  };

  return (
    <div className="fade-in">
      <PageHead title="Kindness" sub="Small ways to brighten someone's day, and your own." onBack={() => go({ name: 'home' })} />
      <KindActCard />

      <div className="card">
        <h2>Send a kind note</h2>
        <p className="small muted">Your note goes to a random person using iDID who has chosen to receive them. It's anonymous both ways. There are no replies or messages, just a little light.</p>
        {!online ? (
          <p className="small">Kind notes need the online circle. <button className="btn ghost sm" onClick={() => go({ name: 'account' })}>Sign in</button></p>
        ) : sent ? (
          <div className="card accent" role="status">
            {sent === 'yes' ? <><b>Sent.</b> Somewhere, someone will open iDID to your kind words. Thank you.</> : <>Everyone who can receive a note today has already been brightened. Try again later.</>}
            <div style={{ marginTop: '.5rem' }}><button className="btn sm" onClick={() => setSent(null)}>Send another</button></div>
          </div>
        ) : (
          <>
            <div className="eyebrow">Choose your words</div>
            <div className="stack" style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
              {KIND_MESSAGES.map((m, i) => (
                <button key={i} className="chip" aria-pressed={msg === i} style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', borderRadius: 14 }} onClick={() => setMsg(i)}>{m}</button>
              ))}
            </div>
            <div className="eyebrow" style={{ marginTop: '.8rem' }}>Add a little picture</div>
            <div className="chips">
              {KIND_ICONS.map((k) => <button key={k.id} className="chip" aria-pressed={icon === k.id} aria-label={k.label} onClick={() => setIcon(k.id)}><Icon name={k.id} size={18} /></button>)}
            </div>
            <button className="btn primary" style={{ marginTop: '.9rem' }} disabled={msg == null || busy} onClick={send}><Icon name="send" size={17} /> {busy ? 'Sending…' : 'Send anonymously'}</button>
          </>
        )}
      </div>

      <div className="card">
        <h2>Notes for you</h2>
        {online && <Switch label="Receive kind notes" hint="Up to three a day, from people using iDID. You'll never see who sent them, and they'll never see who you are." checked={!!receive} onChange={async (v) => { setReceive(v); await setReceiveKindNotes(v).catch(() => toast('Could not save that right now.')); }} />}
        {notes.length === 0 ? <p className="small muted" style={{ marginBottom: 0 }}>{online ? (receive ? 'No notes yet. They’ll appear here when someone sends one.' : 'Turn on "Receive kind notes" to get encouragement from others.') : 'Sign in to the online circle to send and receive kind notes.'}</p>
          : notes.map((n) => <KindNoteView key={n.id} n={n} />)}
      </div>
    </div>
  );
}
