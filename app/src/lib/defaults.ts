import type { DeviceSettings, Prefs } from '../types';

export const DEFAULT_TRIGGERS = [
  'Loud noise', 'Crowds', 'Conflict / raised voices', 'A smell', 'Touch', 'A memory',
  'Anniversary / date', 'Feeling unsafe', 'Being alone', 'Tiredness', 'Hunger',
  'Pain / illness', 'Medication change', 'Work / school stress', 'Social media / news',
  'Someone from the past', 'Feeling criticised', 'Bright lights', 'Not sure',
];

export const DEFAULT_LOCATIONS = [
  'Home', 'Bedroom', 'Work', 'School', 'Car / travelling', 'Shop', 'Outdoors',
  "Friend's / family home", 'Appointment', 'Online',
];

export const DEFAULT_FEELINGS = [
  'Calm', 'Numb', 'Foggy', 'Anxious', 'Scared', 'Sad', 'Angry', 'Overwhelmed',
  'Ashamed', 'Confused', 'Detached', 'Young / small', 'Tired', 'Relieved', 'Safe',
];

export const OBSERVED_SIGNS = [
  'Voice changed', 'Posture / movement changed', 'Different name used', "Didn't recognise me",
  'Seemed younger', 'Seemed far away', 'Unusual handwriting', 'Different preferences',
  'Withdrawn / quiet', 'Upset or scared', 'Irritable', 'Confused about time or place',
];

export const PALETTE = ['#7c9a8a', '#8a9bb8', '#b89a7c', '#a58bb0', '#c4a35a', '#6f9fa6', '#b88a8a', '#8fa36b'];

const mq = (q: string) => typeof matchMedia !== 'undefined' && matchMedia(q).matches;

export function defaultPrefs(): Prefs {
  return { id: 'prefs', circleName: '', partWord: 'parts', customTriggers: [], customLocations: [], customFeelings: [], showCheckIn: true };
}

export function defaultDevice(): DeviceSettings {
  return {
    theme: mq('(prefers-color-scheme: dark)') ? 'dusk' : 'morning',
    textSize: 'medium',
    reduceMotion: mq('(prefers-reduced-motion: reduce)'),
    readableFont: false,
    softEdges: true,
    activeMemberId: null,
    lastOpenedAt: null,
    notifyObservations: true,
    notifyAppointments: true,
    checkInTime: null,
    autoLockMins: 5,
    nudges: true,
    nudgesPerDay: 2,
    quietStart: '21:00',
    quietEnd: '09:00',
    lastSeenVersion: null,
    badges: true,
    featureTips: true,
    tourOffered: false,
    kindActs: true,
  };
}

export const MOODS = [
  { value: 1, label: 'Very hard' },
  { value: 2, label: 'Hard' },
  { value: 3, label: 'In between' },
  { value: 4, label: 'Okay' },
  { value: 5, label: 'Settled' },
];
