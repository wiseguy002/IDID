import { useEffect, useState } from 'react';
import { useApp } from '../state';
import { track } from '../db';
import { partWords } from '../lib/util';
import { PageHead } from '../components/ui';
import { Icon } from '../components/Icon';

type Script = { when: string; say: string[]; avoid: string[]; do: string[] };

/** For partners, family and friends: what dissociation can look like, and what to say. */
export default function Supporters() {
  const { settings, go } = useApp();
  const w = partWords(settings.partWord);
  const [open, setOpen] = useState<number | null>(0);
  const { me } = useApp();
  useEffect(() => { track(me?.id, 'supporters'); }, [me?.id]);

  const scripts: Script[] = [
    {
      when: 'They seem far away, foggy or "not here"',
      say: ['"You\'re safe. It\'s [day], and you\'re at [place]."', '"I\'m right here. Take your time."', '"Can you feel your feet on the floor? Want to hold something cold?"'],
      avoid: ['Snapping your fingers, shaking them or raising your voice.', '"Snap out of it" or "You\'re doing this for attention."'],
      do: ['Speak slowly and calmly, and keep a little distance unless they want closeness.', 'Offer a grounding object: something cold, textured or scented.', 'Afterward, ask if they\'d like you to add a note in iDID about what you saw.'],
    },
    {
      when: `A different ${w.one} seems to be here`,
      say: ['"Hi. I\'m [your name]. Do you want to tell me your name?"', '"You\'re safe here. Is there anything you need?"', '"Would it help to know what day it is and what\'s been happening?"'],
      avoid: [`Demanding that a particular ${w.one} "come back".`, `Treating a younger ${w.one} as silly, or testing whether a switch is "real".`],
      do: [`Be as respectful as you would with anyone you're meeting for the first time.`, `If they want, they can note who's here in iDID, or read notes left for them on the inner board.`, 'Keep routines and promises the same, whoever is around.'],
    },
    {
      when: 'After lost time',
      say: ['"You might have lost some time. That\'s okay. Want me to fill in what I know?"', '"It\'s [time] now. You\'re safe."', '"Nothing bad happened while you were away." (only if true)'],
      avoid: ['"Don\'t you remember?" or quizzing them.', 'Filling the gap with guesses, or with details that might be upsetting.'],
      do: ['Gently share only facts they ask for: time, place, who was there, anything they need to do.', 'Point them to "What did I miss?" in iDID, which shows what was noted in the app during the gap.', 'Offer water, food or rest. Lost time can be tiring.'],
    },
    {
      when: 'They\'re overwhelmed or panicking',
      say: ['"Let\'s breathe together. In for four… hold… out for four."', '"You don\'t have to talk. I\'ll stay with you."', '"What would help right now: quiet, a walk, or a distraction?"'],
      avoid: ['Lots of questions, touching without asking, or crowding them.', 'Telling them to calm down.'],
      do: ['Open the Calm space in iDID together: box breathing or a calming game.', 'Turn down noise and light where you can.', 'If they have a safety plan, follow it. In danger? Call 911, or call or text 988.'],
    },
    {
      when: 'Talking about it later',
      say: ['"Would it help to talk about earlier, or would you rather not?"', '"I noticed [specific, neutral thing]. I\'m not upset. I just want to understand."', '"What helps you most when that happens?"'],
      avoid: ['Blame, or keeping score.', 'Sharing what they told you with others without asking.'],
      do: ['Add what you noticed to their entry in iDID, if they\'ve asked for observations.', 'Ask what they\'d like you to do next time, and write it on their safety plan together.', 'Look after yourself too. Supporters need support.'],
    },
  ];

  return (
    <div className="fade-in">
      <PageHead title="Supporting someone" sub="A short guide for partners, family and friends." onBack={() => go({ name: 'circle' })} />
      <div className="card soft">
        <p style={{ marginTop: 0 }}>Dissociation is the mind's way of coping when things are too much. It can look like zoning out, losing time, feeling unreal, or, for people with DID, different {w.many} taking turns. It isn't something people choose, and it isn't dangerous in itself.</p>
        <p style={{ margin: 0 }}>You don't need the perfect words. Being calm, kind and steady helps most. These are starting points. Change them to fit the person, and ask them what they'd prefer.</p>
      </div>

      {scripts.map((s, i) => (
        <div key={s.when} className="card">
          <button className="row between" style={{ width: '100%', background: 'none', border: 0, padding: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer' }} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <b>{s.when}</b><Icon name="chevron" size={18} />
          </button>
          {open === i && <div style={{ marginTop: '.6rem' }}>
            <div className="eyebrow">You could say</div>
            <ul className="small" style={{ marginTop: 0 }}>{s.say.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="eyebrow">Helpful things to do</div>
            <ul className="small" style={{ marginTop: 0 }}>{s.do.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="eyebrow">Try to avoid</div>
            <ul className="small" style={{ margin: 0 }}>{s.avoid.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>}
        </div>
      ))}

      <div className="card blue">
        <p className="small" style={{ marginTop: 0 }}>More on dissociation, DID and supporting someone is at <b>idid.care/learn</b>. Support groups for families can help too.</p>
        <div className="row"><button className="btn sm" onClick={() => go({ name: 'support' })}>Find support</button><button className="btn sm" onClick={() => go({ name: 'safety' })}>Safety plan</button></div>
      </div>
    </div>
  );
}
