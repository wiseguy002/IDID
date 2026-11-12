/**
 * Curated words of encouragement for anonymous kind notes. Notes send only the
 * message number, so wording can be improved later without changing the server.
 * NEVER reorder or remove entries; only append (the number is stored).
 */
export const KIND_MESSAGES: string[] = [
  "You're doing great. Truly.",
  'Keep your head up. You matter.',
  'Someone out here is rooting for you today.',
  "It's okay to go slowly. You're still moving.",
  'You are not alone in this.',
  'Rest is part of healing, not a break from it.',
  'Every part of you deserves kindness.',
  'Thank you for still being here.',
  "Hard days don't erase how far you've come.",
  'Be gentle with yourself today.',
  "You're braver than you feel right now.",
  'Small steps count. All of them.',
  'Sending you a little warmth from one iDID friend to another.',
  'I hope something makes you smile today.',
  'You deserve the care you give others.',
  "It's okay to ask for help. That's strength.",
  'Your story is still being written.',
  'Breathe. You made it to this moment.',
  'You make the world a little brighter by being in it.',
  "Whatever today holds, you don't have to carry it alone.",
];

export const KIND_ICONS = [
  { id: 'sun', label: 'Sunshine' },
  { id: 'flower', label: 'Flower' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'sparkle', label: 'Sparkle' },
] as const;
export type KindIcon = (typeof KIND_ICONS)[number]['id'];

/** Small, doable acts of kindness, including easy ones for low-energy days. */
export const KIND_ACTS: string[] = [
  'Smile at someone you pass today.',
  'Say hi to a neighbour, a cashier, or a bus driver.',
  'Send a "thinking of you" text to someone you care about.',
  'Hold a door open for someone.',
  'Thank someone for something small they did.',
  'Leave a kind comment on something someone shared.',
  'Tell someone one thing you appreciate about them.',
  'Let someone go ahead of you in line.',
  'Pick up one piece of litter.',
  'Give a sincere compliment.',
  'Check in on a friend who has been quiet lately.',
  'Write a short thank-you note to someone who helped you.',
  'Share something that made you laugh with a friend.',
  'Fill up a water bowl for a pet, or a bird bath.',
  'Ask someone how they are, and really listen.',
  'Send an anonymous kind note to someone using iDID.',
  'Be kind to yourself: say one encouraging thing to the mirror.',
  'Donate something you no longer need.',
  'Make a cup of tea or coffee for someone in your home.',
  'Learn the name of someone you see often, and use it.',
];

function dayIndex(d = new Date()) {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

/** Today's suggestion (the same all day), with an optional offset for "another idea". */
export function kindActFor(d = new Date(), offset = 0) {
  return KIND_ACTS[(dayIndex(d) * 7 + offset) % KIND_ACTS.length];
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
