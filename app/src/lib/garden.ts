/**
 * Mood Garden: a garden that grows from the ways people look after themselves.
 *
 * - One plant per part (or one plant for a person without parts, including family members).
 * - Growth comes only from care: noticing moments, pauses, check-ins, kind acts, body basics,
 *   observations given. It never goes down. Hard days add growth too ("rain waters the garden").
 * - Mood shows as weather (optional), never as plant health. Tough stretches bring wind and
 *   storms; plants bend but keep growing, and a rainbow follows when things ease.
 * Everything is worked out on the device from data iDID already has.
 */
import type { Activity, CheckIn, Entry, Member, Observation, Part } from '../types';

export type PlantKind = 'sunflower' | 'fern' | 'cactus' | 'lavender' | 'oak' | 'willow' | 'wildflower' | 'rose' | 'moss' | 'bamboo';
export interface PlantChoice { kind: PlantKind; name?: string }

/** Plant types and the traits they can stand for. People pick what fits; nothing is assigned. */
export const PLANTS: { kind: PlantKind; label: string; trait: string; bloom: string }[] = [
  { kind: 'sunflower', label: 'Sunflower', trait: 'Bright, outgoing, turns toward the light', bloom: '#f2c14e' },
  { kind: 'fern', label: 'Fern', trait: 'Gentle and quiet, happiest in the shade', bloom: '#a8d5a2' },
  { kind: 'cactus', label: 'Cactus', trait: 'Protective, strong boundaries, resilient', bloom: '#e889a8' },
  { kind: 'lavender', label: 'Lavender', trait: 'Calming, soothing, a caretaker', bloom: '#a58bd6' },
  { kind: 'oak', label: 'Oak sapling', trait: 'Steady and grounding, an anchor for others', bloom: '#8fbf7a' },
  { kind: 'willow', label: 'Willow', trait: 'Flexible, bends without breaking', bloom: '#b9d98c' },
  { kind: 'wildflower', label: 'Wildflowers', trait: 'Playful, curious, full of color', bloom: '#f08a6c' },
  { kind: 'rose', label: 'Rose', trait: 'Tender and fierce, beauty with thorns', bloom: '#d9566b' },
  { kind: 'moss', label: 'Moss', trait: 'Quiet and resting, softly there', bloom: '#c7d98b' },
  { kind: 'bamboo', label: 'Bamboo', trait: 'Persistent, grows fast, keeps going', bloom: '#9ccf8f' },
];
export const plantInfo = (k: PlantKind) => PLANTS.find((p) => p.kind === k) ?? PLANTS[0];

/** A gentle default so every part starts with something, based on its role words if there are any. */
export function suggestPlant(role = '', index = 0): PlantKind {
  const r = role.toLowerCase();
  if (/protect|guard|defend/.test(r)) return 'cactus';
  if (/little|child|kid|young|play/.test(r)) return 'wildflower';
  if (/care|nurtur|sooth|mother|comfort/.test(r)) return 'lavender';
  if (/host|anchor|main|core|ground/.test(r)) return 'oak';
  if (/quiet|dormant|rest|shy/.test(r)) return 'moss';
  if (/social|bright|front/.test(r)) return 'sunflower';
  const cycle: PlantKind[] = ['sunflower', 'fern', 'lavender', 'wildflower', 'willow', 'bamboo', 'rose', 'oak'];
  return cycle[index % cycle.length];
}

// ---------- Growth ----------

/** Points for each kind of care. Tuned so about a month of gentle use reaches a first bloom. */
export const POINTS = { moment: 8, note: 4, comfort: 4, observation: 6, checkin: 3, hardDay: 5, pause: 4, calm: 3, box: 3, kind: 3, body: 2 } as const;
export const STAGES = ['Seedling', 'Sprout', 'Leafy', 'Budding', 'Blooming'] as const;
const THRESHOLDS = [0, 15, 40, 75, 110];

export interface Growth { points: number; stage: number; flowers: number; why: Record<string, number> }

export function growthFrom(why: Record<string, number>): Growth {
  const points = Object.entries(why).reduce((n, [k, v]) => n + (POINTS[k as keyof typeof POINTS] ?? 0) * v, 0);
  const stage = THRESHOLDS.reduce((s, t, i) => (points >= t ? i : s), 0);
  const flowers = stage < 4 ? 0 : Math.min(12, 1 + Math.floor((points - THRESHOLDS[4]) / 45));
  return { points, stage, flowers, why };
}

export interface GardenPlant {
  id: string;
  /** The part's or person's name. */
  owner: string;
  /** The plant's own name, if one was given. */
  name: string;
  kind: PlantKind;
  color: string;
  resting: boolean;
  growth: Growth;
}

export interface GardenInput {
  me: Member;
  parts: Part[];
  entries: Entry[];
  checkins: CheckIn[];
  observations: Observation[];
  activity: Activity | undefined;
  boardNotes: { fromPartId: string | null }[];
  comfort: { fromPartId?: string | null }[];
  bodyDays: number;
}

/** The garden for one person: a plant per part, or a single plant when they have no parts (family gardens too). */
/** Care for the whole person or system, counted once. */
function sharedCare(d: GardenInput): Record<string, number> {
  const counts = d.activity?.counts ?? {};
  const mine = d.checkins.filter((c) => c.memberId === d.me.id);
  return {
    checkin: mine.length,
    hardDay: mine.filter((c) => c.feeling === 'struggling').length,
    pause: counts.pause ?? 0,
    calm: counts.calm ?? 0,
    box: counts['box-breath'] ?? 0,
    kind: (counts['kind-act'] ?? 0) + (counts['kind-sent'] ?? 0),
    body: d.bodyDays,
    observation: d.observations.filter((o) => o.memberId === d.me.id && o.status === 'done').length,
  };
}

/** Everything the person (or system) has already done, for acknowledging the work so far. */
export function careSoFar(d: GardenInput): Growth {
  const shared = sharedCare(d);
  const parts = d.me.tracked ? d.parts.filter((p) => p.memberId === d.me.id) : [];
  const ids = new Set(parts.map((p) => p.id));
  const moment = d.entries.filter((e) => (parts.length ? e.subjectId === d.me.id : e.authorId === d.me.id || e.subjectId === d.me.id)).length;
  const note = d.boardNotes.filter((n) => n.fromPartId && ids.has(n.fromPartId)).length;
  const comfort = d.comfort.filter((c) => c.fromPartId && ids.has(c.fromPartId)).length;
  return growthFrom(clean({ ...shared, moment, note, comfort }));
}

export function buildGarden(d: GardenInput): GardenPlant[] {
  const shared = sharedCare(d);
  const parts = d.me.tracked ? d.parts.filter((p) => p.memberId === d.me.id) : [];
  if (!parts.length) {
    const moments = d.entries.filter((e) => e.authorId === d.me.id || e.subjectId === d.me.id).length;
    const plant = d.me.plant as PlantChoice | undefined;
    return [{
      id: d.me.id, owner: d.me.name, name: plant?.name ?? '', kind: plant?.kind ?? suggestPlant('', 0), color: d.me.color, resting: false,
      growth: growthFrom(clean({ ...shared, moment: moments })),
    }];
  }
  const share = (n: number) => Math.round((n / parts.length) * 10) / 10 || (n ? 1 : 0);
  return parts.map((p, i) => {
    const moments = d.entries.filter((e) => e.subjectId === d.me.id && (e.frontingPartIds.includes(p.id) || e.coFrontPartIds.includes(p.id))).length;
    const own: Record<string, number> = {
      moment: moments,
      note: d.boardNotes.filter((n) => n.fromPartId === p.id).length,
      comfort: d.comfort.filter((c) => c.fromPartId === p.id).length,
    };
    // Care for the whole system is shared out, so every part grows from it.
    for (const [k, v] of Object.entries(shared)) own[k] = (own[k] ?? 0) + share(v);
    const plant = p.plant as PlantChoice | undefined;
    return {
      id: p.id, owner: p.name, name: plant?.name ?? '', kind: plant?.kind ?? suggestPlant(p.role, i), color: p.color, resting: !!p.archived,
      growth: growthFrom(clean(own)),
    };
  });
}
const clean = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v > 0));

// ---------- Weather and seasons ----------

export type Weather = 'sun' | 'clouds' | 'breeze' | 'rain' | 'storm' | 'rainbow';
export const WEATHER_LABEL: Record<Weather, string> = {
  sun: 'Sunny', clouds: 'Soft clouds', breeze: 'Breezy', rain: 'Wind and rain', storm: 'A storm', rainbow: 'A rainbow after the rain',
};

/** Weather from the last three days of check-ins. Rough stretches bring wind and storms; a rainbow follows when they ease. */
export function weatherFrom(checkins: CheckIn[], now = Date.now()): Weather {
  const recent = checkins.filter((c) => c.at > now - 3 * 86400000).sort((a, b) => b.at - a.at);
  if (!recent.length) return 'clouds';
  const latest = recent[0].feeling;
  const hard = recent.filter((c) => c.feeling === 'struggling').length;
  if (latest === 'struggling') return hard >= 2 ? 'storm' : 'rain';
  if (hard && (latest === 'good' || latest === 'okay')) return 'rainbow';
  return latest === 'good' ? 'sun' : latest === 'okay' ? 'clouds' : 'breeze';
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
/** Northern Hemisphere seasons by month, or always spring if the person prefers. */
export function seasonFor(date: Date, mode: 'seasons' | 'spring'): Season {
  if (mode === 'spring') return 'spring';
  const m = date.getMonth();
  return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
}

/** Plain-language list of what helped a plant grow. */
export function describeGrowth(g: Growth, partOfSystem: boolean): string[] {
  const w = g.why, out: string[] = [];
  const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const add = (k: string, one: string, many: string) => { const v = w[k]; if (v) out.push(`${n(v)} ${v === 1 ? one : many}`); };
  add('moment', partOfSystem ? 'moment while fronting' : 'moment noticed', partOfSystem ? 'moments while fronting' : 'moments noticed');
  add('note', 'note on the inner board', 'notes on the inner board');
  add('comfort', 'comfort kit item', 'comfort kit items');
  add('observation', 'thing noticed for someone else', 'things noticed for someone else');
  add('checkin', 'check-in', 'check-ins');
  add('hardDay', 'hard day (rain waters the garden too)', 'hard days (rain waters the garden too)');
  add('pause', 'pause', 'pauses');
  add('calm', 'visit to the Calm space', 'visits to the Calm space');
  add('box', 'box breathed', 'boxes breathed');
  add('kind', 'kind act or kind note', 'kind acts and kind notes');
  add('body', 'day of body basics', 'days of body basics');
  return out;
}

// ---------- Ways to help it grow ----------

export type CareAction =
  | { kind: 'route'; route: { name: 'pause' | 'calm' | 'kindness' | 'board' | 'comfort' | 'body' | 'log' | 'safety' | 'timeline' } }
  | { kind: 'observe'; id: string }
  | { kind: 'checkin' };
export interface CareIdea { id: string; title: string; why: string; button: string; action: CareAction }

export interface IdeaInput {
  plants: GardenPlant[];
  /** Weather from check-ins, even when it isn't shown, so hard days get gentler ideas. */
  mood: Weather;
  isParts: boolean;
  counts: Record<string, number>;
  checkedInToday: boolean;
  /** An observation someone asked this person for, if any. */
  requestId?: string;
  /** Whether there's someone else in the circle to send a kind note to. */
  hasOthers: boolean;
  hasSafetyPlan: boolean;
  now?: number;
}

/**
 * A few gentle ideas for helping the garden grow, each linking to a part of iDID.
 * Ideas favor things tried least, rotate day to day, and get softer on hard days.
 * They are invitations, never tasks: nothing is lost by ignoring them.
 */
export function careIdeas(d: IdeaInput, max = 3): CareIdea[] {
  const c = (k: string) => d.counts[k] ?? 0;
  const hard = d.mood === 'rain' || d.mood === 'storm';
  const live = d.plants.filter((p) => !p.resting);
  const smallest = d.isParts && live.length > 1 ? [...live].sort((a, b) => a.growth.points - b.growth.points)[0] : undefined;
  const out: (CareIdea & { score: number })[] = [];
  const add = (score: number, idea: CareIdea) => out.push({ ...idea, score });

  if (d.requestId) add(90, { id: 'observe', title: 'Someone asked what you noticed', why: 'Sharing what you saw helps them understand, and grows your garden too.', button: 'Answer', action: { kind: 'observe', id: d.requestId } });
  if (!d.checkedInToday) add(hard ? 50 : 70, { id: 'checkin', title: 'Check in with yourself', why: 'However you\'re doing, saying so waters the garden.', button: 'Check in', action: { kind: 'checkin' } });
  add(hard ? 85 : 40 - c('box-breath'), { id: 'box', title: hard ? 'Breathe one box together' : 'Build a box with box breathing', why: 'Four slow sides: breathe in, hold, out, hold. Each box helps every plant.', button: 'Box breathing', action: { kind: 'route', route: { name: 'pause' } } });
  add(hard ? 80 : 38 - c('calm'), { id: 'calm', title: hard ? 'Rest in the Calm space' : 'Play a game in the Calm space', why: 'Gentle games and grounding to help the body settle.', button: 'Open Calm', action: { kind: 'route', route: { name: 'calm' } } });
  if (hard) add(75, { id: 'comfort-hard', title: 'Reach for your comfort kit', why: 'The things that have helped before are kept there for days like this.', button: 'Comfort kit', action: { kind: 'route', route: { name: 'comfort' } } });
  if (hard && d.hasSafetyPlan && d.mood === 'storm') add(70, { id: 'safety', title: 'Look at your safety plan', why: 'A rough stretch is exactly what it\'s for. You made it on a steadier day.', button: 'Safety plan', action: { kind: 'route', route: { name: 'safety' } } });
  if (!hard && d.hasOthers) add(36 - c('kind-sent') * 2, { id: 'kind-note', title: 'Pay it forward', why: 'Send someone in your circle a kind note. Kindness given grows your garden as well as theirs.', button: 'Send a kind note', action: { kind: 'route', route: { name: 'kindness' } } });
  if (!hard) add(30 - c('kind-act'), { id: 'kind-act', title: 'Try a small act of kindness', why: 'Something small for someone else, or for yourself, counts.', button: 'See ideas', action: { kind: 'route', route: { name: 'kindness' } } });
  if (smallest) {
    add(55, { id: 'board', title: `Help ${smallest.owner}'s plant grow`, why: `${smallest.owner} could leave a note on the inner board. Every voice in the system matters.`, button: 'Inner board', action: { kind: 'route', route: { name: 'board' } } });
    if (!hard) add(28, { id: 'comfort', title: `Add something ${smallest.owner} finds comforting`, why: 'Comfort kit items from a part grow that part\'s plant.', button: 'Comfort kit', action: { kind: 'route', route: { name: 'comfort' } } });
  }
  add(hard ? 20 : 26, { id: 'log', title: 'Note a moment', why: 'Noticing what happened, even a little, is care. It helps you see patterns later.', button: 'Note a moment', action: { kind: 'route', route: { name: 'log' } } });
  if (!hard) add(22, { id: 'body', title: 'Body basics', why: 'Water, food, rest and meds: small check marks that look after you.', button: 'Body basics', action: { kind: 'route', route: { name: 'body' } } });

  // Rotate gently from day to day so the same ideas don't always lead.
  const day = Math.floor((d.now ?? Date.now()) / 86400000);
  const jitter = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0) + day) % 997, 7) % 9;
  return out.sort((a, b) => b.score + jitter(b.id) - (a.score + jitter(a.id))).slice(0, max).map(({ score: _s, ...i }) => i);
}
