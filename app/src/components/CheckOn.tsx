import { useState } from 'react';
import { store, uid, useAll } from '../db';
import { useApp } from '../state';
import type { CheckOnAlert, CheckOnAsk } from '../types';
import { relTime } from '../lib/util';
import { Sheet } from './ui';
import { Icon } from './Icon';

export const ASKS: { value: CheckOnAsk; label: string; phrase: string }[] = [
  { value: 'check', label: 'Check on me', phrase: 'check on me' },
  { value: 'call', label: 'Please call me', phrase: 'call me' },
  { value: 'text', label: 'Please text me', phrase: 'text me' },
  { value: 'visit', label: 'Please come over', phrase: 'come over' },
];
const phrase = (a: CheckOnAsk) => ASKS.find((x) => x.value === a)?.phrase ?? 'check on me';

/** Ask chosen people to reach out, without having to explain. */
export function CheckOnSheet({ onClose }: { onClose: () => void }) {
  const { me, members, toast } = useApp();
  const contacts = useAll('contacts').filter((c) => c.memberId === me?.id && c.phone);
  const people = members.filter((m) => m.id !== me?.id);
  const [ask, setAsk] = useState<CheckOnAsk>('check');
  const [to, setTo] = useState<string[]>(people.filter((m) => m.userId).map((m) => m.id));
  const [sms, setSms] = useState<string[]>(contacts.filter((c) => c.pinned).map((c) => c.id));
  const [sent, setSent] = useState(false);

  const body = `Hi, it's ${me?.name ?? 'me'}. Could you ${phrase(ask)} when you can? (Sent from iDID)`;
  const smsHref = () => {
    const nums = contacts.filter((c) => sms.includes(c.id)).map((c) => c.phone.replace(/[^\d+]/g, ''));
    return `sms:${nums.join(',')}?&body=${encodeURIComponent(body)}`;
  };
  const send = async () => {
    if (to.length && me) await store.put('alerts', { id: uid(), fromMemberId: me.id, toMemberIds: to, ask, createdAt: Date.now(), acks: {}, resolvedAt: null });
    setSent(true);
    if (to.length) toast(to.some((id) => members.find((m) => m.id === id)?.userId) ? 'Sent. They’ll get a notification.' : 'Sent. They’ll see it next time they open iDID.');
  };

  return (
    <Sheet title="Check on me" onClose={onClose}>
      {!sent ? (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>Quietly ask people you trust to reach out. You don't need to explain anything.</p>
          <div className="eyebrow">What would help?</div>
          <div className="chips">{ASKS.map((a) => <button key={a.value} className="chip" aria-pressed={ask === a.value} onClick={() => setAsk(a.value)}>{a.label}</button>)}</div>
          {people.length > 0 && <>
            <div className="eyebrow" style={{ marginTop: '.9rem' }}>From my circle</div>
            <div className="chips">{people.map((m) => <button key={m.id} className="chip" aria-pressed={to.includes(m.id)} onClick={() => setTo(to.includes(m.id) ? to.filter((x) => x !== m.id) : [...to, m.id])}><span className="dot" style={{ background: m.color }} />{m.name}{!m.userId && <span className="tiny muted">(this device)</span>}</button>)}</div>
          </>}
          {contacts.length > 0 && <>
            <div className="eyebrow" style={{ marginTop: '.9rem' }}>Send a text to</div>
            <div className="chips">{contacts.map((c) => <button key={c.id} className="chip" aria-pressed={sms.includes(c.id)} onClick={() => setSms(sms.includes(c.id) ? sms.filter((x) => x !== c.id) : [...sms, c.id])}>{c.name}</button>)}</div>
          </>}
          {!people.length && !contacts.length && <p className="small">Add people to your circle, or save support contacts with a phone number, to use Check on me.</p>}
          <div className="row" style={{ marginTop: '1rem' }}>
            {to.length > 0 && <button className="btn primary" onClick={send}><Icon name="bell" size={17} /> Ask them</button>}
            {sms.length > 0 && <a className="btn" href={smsHref()} onClick={() => { if (!to.length) setSent(true); }}><Icon name="send" size={16} /> Text {sms.length === 1 ? contacts.find((c) => c.id === sms[0])?.name : `${sms.length} people`}</a>}
          </div>
        </>
      ) : (
        <>
          <div className="card accent"><b>You reached out. That took courage.</b><p className="small" style={{ margin: '.3rem 0 0' }}>While you wait, try a few slow breaths, or open your safety plan.</p></div>
          <p className="small">If you're in danger right now, call <a href="tel:911"><b>911</b></a>. For crisis support, call or text <a href="tel:988"><b>988</b></a>.</p>
          <button className="btn" onClick={onClose}>Close</button>
        </>
      )}
    </Sheet>
  );
}

/** Home cards: requests for me to check on someone, and the status of my own request. */
export function CheckOnCards() {
  const { me, members, toast } = useApp();
  const alerts = useAll('alerts').filter((a) => !a.resolvedAt && Date.now() - a.createdAt < 24 * 3600000);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? 'Someone';
  const incoming = alerts.filter((a) => me && a.toMemberIds.includes(me.id) && a.fromMemberId !== me.id);
  const mine = alerts.filter((a) => a.fromMemberId === me?.id);
  const ack = (a: CheckOnAlert) => me && store.patch('alerts', a.id, { acks: { ...a.acks, [me.id]: Date.now() } }).then(() => toast(`${name(a.fromMemberId)} will see that you're on your way.`));
  return (
    <>
      {incoming.map((a) => (
        <div key={a.id} className="card warm" role="alert">
          <div className="eyebrow"><Icon name="bell" size={14} /> {relTime(a.createdAt)}</div>
          <p style={{ margin: '0 0 .6rem', fontSize: '1.08rem' }}><b>{name(a.fromMemberId)}</b> asked you to {phrase(a.ask)}.</p>
          {me && a.acks[me.id] ? <p className="small" style={{ margin: 0 }}>You said you're on it. Thank you.</p> : (
            <button className="btn sm primary" onClick={() => ack(a)}>I'm on it</button>
          )}
        </div>
      ))}
      {mine.map((a) => {
        const responders = Object.keys(a.acks).map(name);
        return (
          <div key={a.id} className="card blue">
            <div className="eyebrow"><Icon name="people" size={14} /> You asked someone to {phrase(a.ask)}</div>
            <p style={{ margin: '0 0 .6rem' }}>{responders.length ? <><b>{responders.join(', ')}</b> {responders.length === 1 ? 'is' : 'are'} on the way.</> : 'Waiting for someone to respond. Take some slow breaths.'}</p>
            <button className="btn sm" onClick={() => store.patch('alerts', a.id, { resolvedAt: Date.now() })}>I'm okay now</button>
          </div>
        );
      })}
    </>
  );
}
