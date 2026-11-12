import { useEffect, useMemo, useRef, useState } from 'react';
import { getActivity, store, track, updateDevice, useAll } from '../db';
import { useApp } from '../state';
import GardenScene, { Plant } from '../components/GardenScene';
import { NudgeSheet } from '../components/NudgeSheet';
import {
  buildGarden, careIdeas, careSoFar, describeGrowth, PLANTS, plantInfo, seasonFor, STAGES, weatherFrom, WEATHER_LABEL, type GardenPlant, type PlantKind,
} from '../lib/garden';
import { partWords } from '../lib/util';
import { PageHead, Segmented, Sheet, Switch } from '../components/ui';

const SEASON_LABEL = { spring: 'Spring', summer: 'Summer', autumn: 'Fall', winter: 'Winter' } as const;

function PlantSheet({ plant, isPart, onClose }: { plant: GardenPlant; isPart: boolean; onClose: () => void }) {
  const { toast, settings } = useApp();
  const [kind, setKind] = useState<PlantKind>(plant.kind);
  const [name, setName] = useState(plant.name);
  const info = plantInfo(kind);
  const why = describeGrowth(plant.growth, isPart);
  const save = async () => {
    const choice = { kind, name: name.trim() || undefined };
    if (isPart) await store.patch('parts', plant.id, { plant: choice });
    else await store.patch('members', plant.id, { plant: choice });
    toast(`${name.trim() || info.label} is ${plant.owner}'s plant.`);
    onClose();
  };
  const w = partWords(settings.partWord);
  return (
    <Sheet title={`${plant.owner}'s plant`} onClose={onClose}>
      <p style={{ marginTop: 0 }}><b>{plant.name || plantInfo(plant.kind).label}</b> · {STAGES[plant.growth.stage]}{plant.growth.flowers > 1 ? ` · ${plant.growth.flowers} flowers` : ''}{plant.resting ? ' · resting' : ''}</p>
      {why.length ? (<><p className="small muted" style={{ margin: '0 0 .3rem' }}>What helped it grow:</p><ul className="small" style={{ marginTop: 0, paddingLeft: '1.2rem' }}>{why.map((x) => <li key={x}>{x}</li>)}</ul></>)
        : <p className="small muted">{plant.resting ? `${plant.owner} is resting, so their seedling waits quietly.` : 'A seedling, waiting. It grows whenever care happens: a check-in, a pause, a moment noticed.'}</p>}
      <hr className="hr" />
      <label className="field"><span>Give it a name (optional)</span>
        <input id="plant-name" className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${isPart ? `${plant.owner}'s ${info.label.toLowerCase()}` : 'Old Faithful'}`} /></label>
      <div className="eyebrow" style={{ marginTop: '.6rem' }}>Choose a plant{isPart ? ` that fits ${plant.owner}` : ''}</div>
      <div className="plant-pick" role="radiogroup" aria-label="Plant type">
        {PLANTS.map((p) => (
          <button key={p.kind} type="button" role="radio" aria-checked={kind === p.kind} aria-pressed={kind === p.kind} onClick={() => setKind(p.kind)}>
            <svg viewBox="-40 -120 80 130" aria-hidden="true"><Plant kind={p.kind} stage={4} flowers={1} bloom={p.bloom} /></svg>
            <b>{p.label}</b><span className="small muted">{p.trait}</span>
          </button>
        ))}
      </div>
      <p className="tiny muted">{isPart ? `Any plant can belong to any ${w.one}. Pick what feels right; you can change it any time.` : 'Pick whatever feels like you. You can change it any time.'}</p>
      <div className="row" style={{ marginTop: '.6rem' }}><button className="btn primary" onClick={save}>Save</button><button className="btn ghost" onClick={onClose}>Cancel</button></div>
    </Sheet>
  );
}

export default function Garden() {
  const { me, members, parts: allParts, settings, go } = useApp();
  const entries = useAll('entries'), checkins = useAll('checkins'), observations = useAll('observations');
  const board = useAll('board'), comfort = useAll('comfort'), body = useAll('body'), safety = useAll('safety');
  const [selected, setSelected] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const counted = useRef(false);
  useEffect(() => { if (me && !counted.current) { counted.current = true; track(me.id, 'garden'); } }, [me]);

  const input = useMemo(() => (me ? {
    me, parts: allParts, entries, checkins, observations, activity: getActivity(me.id),
    boardNotes: board.filter((n) => n.memberId === me.id), comfort: comfort.filter((c) => c.memberId === me.id),
    bodyDays: body.filter((b) => b.memberId === me.id).length,
  } : null), [me, allParts, entries, checkins, observations, board, comfort, body]);
  const plants = useMemo(() => (input ? buildGarden(input) : []), [input]);
  if (!me || !input) return null;

  const isParts = me.tracked && allParts.some((p) => p.memberId === me.id);
  const weather = settings.gardenWeather ? weatherFrom(checkins.filter((c) => c.memberId === me.id)) : null;
  const season = seasonFor(new Date(), settings.gardenSeasons);
  const sel = plants.find((p) => p.id === selected);
  const w = partWords(settings.partWord);
  const blooming = plants.filter((p) => p.growth.stage === 4).length;
  const myCheckins = checkins.filter((c) => c.memberId === me.id);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ideas = careIdeas({
    plants, mood: weatherFrom(myCheckins), isParts, counts: input.activity?.counts ?? {},
    checkedInToday: myCheckins.some((c) => c.at >= today.getTime()),
    requestId: observations.find((o) => o.memberId === me.id && o.status === 'requested')?.id,
    hasOthers: members.some((m) => m.id !== me.id),
    hasSafetyPlan: safety.some((p) => p.memberId === me.id),
  });
  const soFar = describeGrowth(careSoFar(input), isParts);
  const act = (i: (typeof ideas)[number]) => {
    if (i.action.kind === 'checkin') setCheckingIn(true);
    else if (i.action.kind === 'observe') go({ name: 'observe', id: i.action.id });
    else go(i.action.route);
  };

  return (
    <div className="fade-in">
      <PageHead title="Mood Garden" sub={isParts ? `A plant for each of your ${w.many}, grown by the ways you look after yourselves.` : 'Your garden, grown by the ways you look after yourself and others.'} onBack={() => go({ name: 'home' })} />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="row between" style={{ padding: '.7rem 1rem', flexWrap: 'wrap', gap: '.4rem' }}>
          <b>{SEASON_LABEL[season]}{weather ? ` · ${WEATHER_LABEL[weather]}` : ''}</b>
          <span className="small muted">{blooming ? `${blooming} blooming` : 'Growing gently'}</span>
        </div>
        <GardenScene plants={plants} weather={weather} season={season} calm={settings.reduceMotion} selectedId={selected} onSelect={setSelected}
          label={`${me.name}'s garden: ${plants.map((p) => `${p.owner}, ${STAGES[p.growth.stage].toLowerCase()}`).join('; ')}`} />
        <p className="small muted" style={{ padding: '.7rem 1rem', margin: 0 }} aria-live="polite">
          {weather === 'rain' || weather === 'storm' ? 'Hard days bring wind and rain. The garden bends but keeps growing, and the rain waters it too.'
            : weather === 'rainbow' ? 'You came through the rain. There’s a rainbow over the garden.'
            : 'Tap a plant to see what helped it grow, or to choose its plant and name. Nothing here ever wilts.'}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Ways to help it grow</h3>
        <p className="small muted" style={{ marginTop: 0 }}>{weather === 'rain' || weather === 'storm' || (!weather && ['rain', 'storm'].includes(weatherFrom(myCheckins)))
          ? 'On a hard day, the gentlest care counts the most. Only if it feels right:'
          : 'A few ideas, only if they feel right. Nothing is lost by skipping them.'}</p>
        <ul className="care-ideas">
          {ideas.map((i) => (
            <li key={i.id}>
              <div><b>{i.title}</b><span className="small muted">{i.why}</span></div>
              <button className="btn sm" onClick={() => act(i)}>{i.button}</button>
            </li>
          ))}
        </ul>
      </div>

      {soFar.length > 0 && (
        <div className="card small">
          <h3 style={{ marginTop: 0 }}>Look at what you’ve already done</h3>
          <p className="muted" style={{ marginTop: 0 }}>Every one of these was real work. {isParts ? 'Together, you have' : 'You have'}:</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{soFar.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="muted" style={{ marginBottom: 0 }}>Healing isn’t a straight line. This garden only remembers what you’ve done, never what you missed.</p>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Garden settings</h3>
        <Switch label="Weather from check-ins" hint="Sun, clouds, wind and rain follow how you've said you're doing. Plants grow whatever the weather." checked={settings.gardenWeather} onChange={(v) => updateDevice({ gardenWeather: v })} />
        <div className="eyebrow" style={{ marginTop: '.6rem' }}>Season</div>
        <Segmented label="Season" value={settings.gardenSeasons} onChange={(v) => updateDevice({ gardenSeasons: v })} options={[{ value: 'seasons', label: 'Through the year' }, { value: 'spring', label: 'Always spring' }]} />
      </div>

      <div className="card small">
        <h3 style={{ marginTop: 0 }}>How the garden grows</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {isParts && <li>Each {w.one}'s plant grows when they’re fronting in a moment you note, leave a note on the inner board, or add to the comfort kit.</li>}
          <li>Check-ins, pauses, box breathing, the Calm space, small acts of kindness, body basics and noticing things for others help {isParts ? 'every plant' : 'it'} grow.</li>
          <li>Hard days add growth too. Nothing ever wilts, and there are no streaks to keep.</li>
          <li>Your garden is worked out on this device and isn’t shown to anyone else. Plant types and names are saved with each {isParts ? w.one : 'person'}, encrypted like everything else.</li>
        </ul>
      </div>
      {checkingIn && <NudgeSheet onClose={() => setCheckingIn(false)} />}
      {sel && <PlantSheet plant={sel} isPart={isParts} onClose={() => setSelected(null)} />}
    </div>
  );
}
