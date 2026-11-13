import { useCallback, useEffect, useState } from 'react';
import { locale, t, tx } from '../i18n';
import { useApp } from '../state';
import { track, useAll, useOne } from '../db';
import { ContactRow, CrisisCard } from './Support';
import { Icon } from '../components/Icon';
import { PageHead, Segmented } from '../components/ui';
import BoxBreath from '../components/BoxBreath';

const GROUNDING = [
  { n: 5, sense: tx('Notice 5 things you can see'), hint: tx('Look slowly around. Name colors, shapes, light.') },
  { n: 4, sense: tx('Notice 4 things you can feel'), hint: tx('Your feet on the floor. Fabric. The air on your skin.') },
  { n: 3, sense: tx('Notice 3 things you can hear'), hint: tx('Near and far. Your own breath counts.') },
  { n: 2, sense: tx('Notice 2 things you can smell'), hint: tx('Or two smells you like, remembered.') },
  { n: 1, sense: tx('Notice 1 thing you can taste'), hint: tx('Or one kind thing you could say to yourself.') },
];

export default function Pause() {
  const { go, settings, me, checkIn, checkOn } = useApp();
  const plan = useOne('safety', me ? `safety:${me.id}` : undefined);
  useEffect(() => { track(me?.id, 'pause'); }, [me?.id]);
  const pinned = useAll('contacts').filter((c) => c.pinned && (c.memberId === me?.id || !me?.tracked));
  const [mode, setMode] = useState<'breathe' | 'box' | 'ground' | 'orient'>('breathe');
  const onBox = useCallback(() => { track(me?.id, 'box-breath'); }, [me?.id]);
  const [g, setG] = useState(0);
  const now = new Date();
  return (
    <div className="fade-in">
      <PageHead title={t('Pause')} sub={t('Nothing to log. Just a moment for you.')} onBack={() => go({ name: 'home' })} />
      <div className="row" style={{ marginBottom: '.9rem' }}>
        <button className="btn sm" onClick={() => go({ name: 'safety' })}><Icon name="shield" size={16} /> {plan ? t('My safety plan') : t('Make a safety plan')}</button>
        <button className="btn sm" onClick={checkOn}><Icon name="bell" size={16} /> {t('Check on me')}</button>
        <button className="btn sm" onClick={() => go({ name: 'comfort' })}><Icon name="box" size={16} /> {t('Comfort kit')}</button>
        <button className="btn sm primary" onClick={() => go({ name: 'calm' })}><Icon name="sparkle" size={16} /> {t('Calm space')}</button>
      </div>
      <Segmented label={t('Tool')} value={mode} onChange={setMode} options={[{ value: 'breathe', label: t('Breathe') }, { value: 'box', label: t('Box') }, { value: 'ground', label: '5-4-3-2-1' }, { value: 'orient', label: t('Right now') }]} />
      {mode === 'breathe' && (
        <div className="card soft" style={{ marginTop: '1rem', textAlign: 'center' }}>
          {settings.reduceMotion ? (
            <div style={{ padding: '2rem 0' }}><p style={{ fontSize: '1.2rem' }}>{t('Breathe in for 4… hold for 1… out for 5.')}</p><p className="muted">{t('Repeat as many times as you like.')}</p></div>
          ) : (
            <><div className="breath-wrap"><div className="breath" /></div>
              <p className="muted">{t('Breathe in as the circle grows, out as it softens.')}</p></>
          )}
        </div>
      )}
      {mode === 'box' && (
        <div className="card soft" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <BoxBreath reduceMotion={settings.reduceMotion} onBox={onBox} />
        </div>
      )}
      {mode === 'ground' && (
        <div className="card soft" style={{ marginTop: '1rem', textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '3rem', fontWeight: 650, color: 'var(--accent)' }}>{GROUNDING[g].n}</div>
          <h2>{t(GROUNDING[g].sense)}</h2>
          <p className="muted">{t(GROUNDING[g].hint)}</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            {g > 0 && <button className="btn" onClick={() => setG(g - 1)}>{t('Back')}</button>}
            {g < GROUNDING.length - 1 ? <button className="btn primary" onClick={() => setG(g + 1)}>{t('Next')}</button> : <button className="btn primary" onClick={() => setG(0)}>{t('Start again')}</button>}
          </div>
        </div>
      )}
      {mode === 'orient' && (
        <div className="card soft" style={{ marginTop: '1rem', padding: '1.6rem 1.2rem' }}>
          <p style={{ fontSize: '1.15rem' }}>{t('Today is {date}.', { date: now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) })}</p>
          <p style={{ fontSize: '1.15rem' }}>{t('It is about {time}.', { time: now.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' }) })}</p>
          <p style={{ fontSize: '1.15rem' }}>{me?.name ? t('This body is in the present, with {name}.', { name: me.name }) + ' ' : null}{t('Whatever happened before is not happening now.')}</p>
          <p className="muted" style={{ margin: 0 }}>{t("Look around for one thing that tells you it's {year}.", { year: now.getFullYear() })}</p>
        </div>
      )}
      <button className="btn block" style={{ marginTop: '1rem' }} onClick={checkIn}><Icon name="sparkle" size={18} /> {t('Check in with yourself')}</button>
      <h2 style={{ marginTop: '1.4rem' }}>{t('Reach out')}</h2>
      {pinned.length > 0 && <div className="card">{pinned.map((c) => <ContactRow key={c.id} c={c} />)}</div>}
      <CrisisCard />
      <button className="btn sm" onClick={() => go({ name: 'support' })}>{t('More support options')}</button>
    </div>
  );
}
