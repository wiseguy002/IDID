/**
 * Gentle, randomly timed check-ins. Times are random but stable for a given
 * person and day (so every device agrees), spaced apart, and never in quiet hours.
 */
import type { CheckInFeeling } from '../types';

const MIN = 60000;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toMins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Awake window for a day as [start, end) in minutes after local midnight. Handles quiet hours that cross midnight or not. */
export function awakeWindow(quietStart: string, quietEnd: string): [number, number] {
  const qs = toMins(quietStart), qe = toMins(quietEnd);
  // Common case: quiet overnight (e.g. 21:00–09:00) → awake 09:00–21:00.
  if (qs > qe) return [qe, qs];
  // Quiet during the day (e.g. 01:00–07:00) → awake from qe until midnight.
  if (qs < qe) return [qe, 24 * 60];
  return [9 * 60, 21 * 60];
}

/** Nudge times for one local day (the date of `day`). */
export function nudgeTimesForDay(memberId: string, day: Date, perDay: number, quietStart: string, quietEnd: string): number[] {
  const [start, end] = awakeWindow(quietStart, quietEnd);
  const span = end - start;
  if (perDay <= 0 || span < 30) return [];
  const n = Math.min(perDay, Math.max(1, Math.floor(span / 120)));
  const key = `${memberId}:${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
  const r = rng(hash(key));
  // One random time inside each equal slice keeps nudges spread out; avoid slice edges.
  const slice = span / n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const mins = start + i * slice + slice * (0.15 + 0.7 * r());
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    out.push(d.getTime() + Math.round(mins) * MIN);
  }
  return out;
}

export function nudgeTimesBetween(memberId: string, from: number, to: number, perDay: number, quietStart: string, quietEnd: string): number[] {
  const out: number[] = [];
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  while (d.getTime() < to) {
    for (const t of nudgeTimesForDay(memberId, d, perDay, quietStart, quietEnd)) if (t >= from && t < to) out.push(t);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// ---------- Words ----------

const pick = <T>(xs: T[], seed = Math.random()) => xs[Math.floor(seed * xs.length) % xs.length];

export const OPENERS = [
  'Hi, whoever is here right now.',
  'Just checking in, gently.',
  'A small pause, just for you.',
  'Hello. No pressure, only a moment.',
];

export const ASK = 'How are you doing right now?';

export const FEELINGS: { value: CheckInFeeling; label: string }[] = [
  { value: 'good', label: 'Pretty good' },
  { value: 'okay', label: 'Okay' },
  { value: 'wobbly', label: 'A bit wobbly' },
  { value: 'struggling', label: 'Struggling' },
];

/** Hopeful but honest: no "just think positive". */
export const POSITIVE = [
  'You made it to this moment. That counts.',
  "It's okay to have hard moments. They don't undo the good ones.",
  'Every part of you is doing its best to keep you safe.',
  'Small steps are still steps forward.',
  'You deserve the same kindness you would give a friend.',
  'Feelings are like weather: real, and they do pass.',
  "You've got through hard days before. You have more strength than it feels like right now.",
  'Rest is allowed. You don’t have to earn it.',
];

export const GOOD_REPLIES = [
  "That's lovely to hear. Take a second to notice what's helping.",
  'Wonderful. Maybe soak in a little daylight to keep it going.',
  "Glad you're doing well. Remember this feeling; it's yours.",
];

export const DEFAULT_RITUALS = [
  'Make a warm drink and sip it slowly',
  'Wash your face or hands with cool water',
  'Play one favorite song',
  'Stretch your arms up and roll your shoulders',
  'Hold something comforting (a soft blanket, a smooth stone)',
  'Name five things you can see around you',
  'Drink a glass of water',
  'Text someone you trust a simple hello',
  'Step away from screens for five minutes',
  'Water a plant or tidy one small thing',
];

export function outsideIdea(now = new Date()): { title: string; body: string } {
  const h = now.getHours();
  if (h >= 6 && h < 11) return { title: 'Fresh air & morning light', body: 'Step outside or open a window for a few minutes. Morning daylight can lift your mood and steady your sleep.' };
  if (h >= 11 && h < 17) return { title: 'Fresh air & sunshine', body: 'Find a patch of sunshine or a bit of sky: outside, on a step, or by a window. Notice the air on your skin for a few breaths.' };
  if (h >= 17 && h < 21) return { title: 'Evening air', body: 'Open a window or step out to watch the light change. Feel the cooler air and let your shoulders drop.' };
  return { title: 'A breath of night air', body: 'Open a window for a moment and feel the cool air. If it’s safe and calm, look for the moon or a star.' };
}

export function ritualIdea(rituals: string[] | undefined, seed = Math.random()) {
  const list = rituals?.length ? rituals : DEFAULT_RITUALS;
  return pick(list, seed);
}

export const opener = (seed = Math.random()) => pick(OPENERS, seed);
export const positiveLine = (seed = Math.random()) => pick(POSITIVE, seed);
export const goodReply = (seed = Math.random()) => pick(GOOD_REPLIES, seed);

/** Varied, generic lock-screen text for on-device notifications. */
export const NUDGE_NOTES = [
  'How are you doing right now? Take a breath.',
  'A gentle nudge: maybe a little fresh air?',
  'Checking in: how is everyone doing?',
  'Time for a small reset: stretch, sip water, look outside.',
];
