import type { Settings } from '../types';

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

export function defaultSettings(): Settings {
  return {
    id: 'settings',
    onboarded: false,
    circleName: '',
    theme: typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dusk' : 'morning',
    textSize: 'medium',
    reduceMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    readableFont: false,
    softEdges: true,
    partWord: 'parts',
    pinHash: null,
    pinSalt: null,
    lastOpenedAt: null,
    activeMemberId: null,
    customTriggers: [],
    customLocations: [],
    customFeelings: [],
    showCheckIn: true,
  };
}

export const MOODS = [
  { value: 1, label: 'Very hard' },
  { value: 2, label: 'Hard' },
  { value: 3, label: 'In between' },
  { value: 4, label: 'Okay' },
  { value: 5, label: 'Settled' },
];
