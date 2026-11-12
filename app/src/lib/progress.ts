/**
 * Explore: which features someone has tried, gentle milestone badges, and an
 * occasional suggestion of something that might help.
 *
 * Design rules (trauma-informed): no streaks that can be broken, no comparison
 * with others, no penalties. Badges only ever accumulate. Suggestions are at
 * most weekly, never in the first two days, and can be dismissed or turned off.
 *
 * Most progress is worked out from the person's own data; a few actions that
 * leave no data behind (opening Pause, viewing Patterns…) are counted as events.
 */
import type { Route } from '../state';
import type { Activity } from '../types';

export type EventName =
  | 'tour' | 'pause' | 'patterns' | 'timeline' | 'export' | 'calendar' | 'support-viewed'
  | 'kind-sent' | 'kind-received' | 'kind-act' | 'request' | 'comfort' | 'whats-new' | 'calm' | 'calm-helped' | 'calm-answered' | 'box-breath' | 'help' | 'garden';

/** Counts the app derives from stored data for one person. */
export interface Facts {
  entries: number;
  reflections: number;
  parts: number;
  circlePeople: number;
  observationsGiven: number;
  checkins: number;
  helped: number;
  rituals: number;
  supportProfile: boolean;
  safetyPlan: boolean;
  boardNotes: number;
  bodyDays: number;
  meds: number;
  comfortItems: number;
  preps: number;
  checkOnSent: number;
  contacts: number;
  appointments: number;
  online: boolean;
  notifications: boolean;
  /** Read-only views shared with a therapist or someone else. */
  careShares: number;
  /** Invites this person has made for the online circle. */
  invitesSent: number;
}

export interface Feature {
  id: string;
  name: string;
  about: string;
  route: Route;
  group: 'Noticing' | 'Calm & coping' | 'Support' | 'Together' | 'Make it yours';
  used: (f: Facts, a: Activity) => boolean;
  /** Worth suggesting if unused (in order of helpfulness). */
  tipPriority?: number;
  tip?: string;
}

const ev = (a: Activity, e: EventName) => (a.counts[e] ?? 0) > 0;

export const FEATURES: Feature[] = [
  { id: 'log', name: 'Note a moment', group: 'Noticing', route: { name: 'log' }, about: 'Record what happened in a few optional taps.', used: (f) => f.entries > 0, tipPriority: 1, tip: 'When something feels different, a few taps can help you see patterns later.' },
  { id: 'timeline', name: 'Timeline', group: 'Noticing', route: { name: 'timeline' }, about: 'Look back over moments, by day.', used: (_f, a) => ev(a, 'timeline') },
  { id: 'reflect', name: 'Looking back', group: 'Noticing', route: { name: 'timeline' }, about: 'Add what you understand later to an earlier moment.', used: (f) => f.reflections > 0 },
  { id: 'patterns', name: 'Patterns', group: 'Noticing', route: { name: 'insights' }, about: 'See common triggers, places, times and what helps.', used: (_f, a) => ev(a, 'patterns'), tipPriority: 5, tip: 'Patterns can show what tends to come before hard moments, and what helps.' },
  { id: 'parts', name: 'Parts', group: 'Noticing', route: { name: 'circle' }, about: 'Keep notes about the parts of your system.', used: (f) => f.parts > 0 },
  { id: 'pause', name: 'Pause tools', group: 'Calm & coping', route: { name: 'pause' }, about: 'Breathing, box breathing, 5-4-3-2-1 grounding and "right now" orientation.', used: (_f, a) => ev(a, 'pause'), tipPriority: 2, tip: 'Pause has breathing and grounding tools for when things feel like too much.' },
  { id: 'help', name: 'Help & guides', group: 'Make it yours', route: { name: 'help' }, about: 'Step-by-step guides to everything in iDID.', used: (_f, a) => ev(a, 'help'), tipPriority: 6, tip: 'Help & guides walks through everything in iDID, from logging a moment to sharing with your therapist.' },
  { id: 'garden', name: 'Mood Garden', group: 'Calm & coping', route: { name: 'garden' }, about: 'A plant for each part, grown by the ways you look after yourself.', used: (_f, a) => ev(a, 'garden'), tipPriority: 3, tip: 'Your Mood Garden grows from check-ins, pauses and the moments you notice. Nothing in it ever wilts.' },
  { id: 'box', name: 'Box breathing', group: 'Calm & coping', route: { name: 'pause' }, about: 'Breathe in a square and build a little group of boxes.', used: (_f, a) => ev(a, 'box-breath') },
  { id: 'calm', name: 'Calm space', group: 'Calm & coping', route: { name: 'calm' }, about: 'Ripples, light trails and drifting lights to unwind for a minute.', used: (_f, a) => ev(a, 'calm'), tipPriority: 3, tip: 'The Calm space is a quiet minute of ripples or drifting lights, with nothing to do and nothing to win.' },
  { id: 'checkins', name: 'Gentle check-ins', group: 'Calm & coping', route: { name: 'settings' }, about: 'A kind word and a small idea, a few times a day.', used: (f) => f.checkins > 0 },
  { id: 'rituals', name: 'Healthy rituals', group: 'Calm & coping', route: { name: 'settings' }, about: 'Your own small ways to interrupt a hard pattern.', used: (f) => f.rituals > 0, tipPriority: 4, tip: 'Adding a few of your own healthy rituals makes check-ins more personal.' },
  { id: 'safety', name: 'Safety plan', group: 'Calm & coping', route: { name: 'safety' }, about: 'Your warning signs, what helps, and who to reach out to.', used: (f) => f.safetyPlan, tipPriority: 2, tip: 'A safety plan, written while things are calmer, is one of the most helpful tools for getting through a crisis.' },
  { id: 'comfort-kit', name: 'Comfort kit', group: 'Calm & coping', route: { name: 'comfort' }, about: 'Photos, songs, words and letters that help you feel safe.', used: (f) => f.comfortItems > 0, tipPriority: 9, tip: 'Fill a comfort kit with photos, songs and kind words for hard moments.' },
  { id: 'body', name: 'Body basics', group: 'Noticing', route: { name: 'body' }, about: 'Sleep, food, water and medication, with gentle reminders.', used: (f) => f.bodyDays > 0 || f.meds > 0, tipPriority: 10, tip: 'Sleep, food and medication can affect dissociation. Body basics helps you see the link.' },
  { id: 'board', name: 'Inner board', group: 'Noticing', route: { name: 'board' }, about: 'Notes between parts: plans, reminders and reassurance.', used: (f) => f.boardNotes > 0 },
  { id: 'kind-acts', name: 'Small acts of kindness', group: 'Calm & coping', route: { name: 'kindness' }, about: 'A tiny way to brighten someone else’s day.', used: (_f, a) => ev(a, 'kind-act') },
  { id: 'support', name: 'Find support', group: 'Support', route: { name: 'support' }, about: 'Crisis lines, specialists and community near you.', used: (f, a) => f.supportProfile || ev(a, 'support-viewed'), tipPriority: 3, tip: 'Find support can point you to dissociation and trauma specialists, crisis lines and community near you.' },
  { id: 'contacts', name: 'Support contacts', group: 'Support', route: { name: 'support' }, about: 'Your therapist, social worker or crisis center, one tap away.', used: (f) => f.contacts > 0, tipPriority: 6, tip: 'Saving a support contact puts them one tap away on the Pause screen.' },
  { id: 'appointments', name: 'Appointments', group: 'Support', route: { name: 'appointments' }, about: 'Sessions and groups with reminders.', used: (f) => f.appointments > 0, tipPriority: 7, tip: 'Add therapy or group sessions to get reminders and a "since last session" summary.' },
  { id: 'calendar', name: 'Add to calendar', group: 'Support', route: { name: 'appointments' }, about: 'Put appointments in Apple, Outlook or Google Calendar.', used: (_f, a) => ev(a, 'calendar') },
  { id: 'prep', name: 'Prepare for therapy', group: 'Support', route: { name: 'prep' }, about: 'Gather what’s happened and what to bring up before a session.', used: (f) => f.preps > 0 },
  { id: 'careteam', name: 'Therapist & care team', group: 'Support', route: { name: 'careteam' }, about: 'A private, read-only view for your therapist, with exactly what you choose.', used: (f) => f.careShares > 0, tipPriority: 5, tip: 'You can give your therapist a private, read-only view of exactly what you choose, and remove it any time.' },
  { id: 'share', name: 'Share with a clinician', group: 'Support', route: { name: 'share' }, about: 'A printable summary, spreadsheet or backup.', used: (_f, a) => ev(a, 'export'), tipPriority: 8, tip: 'A clinician summary can help you bring what you’ve noticed to your next appointment.' },
  { id: 'circle', name: 'Trust circle', group: 'Together', route: { name: 'circle' }, about: 'People who can add what they noticed.', used: (f) => f.circlePeople > 0 },
  { id: 'observe', name: 'Add what you noticed', group: 'Together', route: { name: 'home' }, about: 'Answer a gentle request from someone in your circle.', used: (f) => f.observationsGiven > 0 },
  { id: 'check-on', name: 'Check on me', group: 'Together', route: { name: 'pause' }, about: 'Quietly ask people you trust to reach out.', used: (f) => f.checkOnSent > 0 },
  { id: 'invite', name: 'Invite someone', group: 'Together', route: { name: 'circle' }, about: 'Invite people, see who has joined, and choose what each person can see.', used: (f) => f.invitesSent > 0 },
  { id: 'online', name: 'Online circle', group: 'Together', route: { name: 'account' }, about: 'Each person on their own phone, end-to-end encrypted.', used: (f) => f.online },
  { id: 'kind-notes', name: 'Kind notes', group: 'Together', route: { name: 'kindness' }, about: 'Send an anonymous note of encouragement to someone using iDID.', used: (_f, a) => ev(a, 'kind-sent') },
  { id: 'notifications', name: 'Notifications', group: 'Make it yours', route: { name: 'settings' }, about: 'Reminders that never show private details.', used: (f) => f.notifications },
  { id: 'comfort', name: 'Comfort settings', group: 'Make it yours', route: { name: 'settings' }, about: 'Colours, text size, calm motion and a readable font.', used: (_f, a) => ev(a, 'comfort') },
  { id: 'tour', name: 'Quick tour', group: 'Make it yours', route: { name: 'explore' }, about: 'A one-minute look at what iDID can do.', used: (_f, a) => ev(a, 'tour') },
  { id: 'request', name: 'Suggest a feature', group: 'Make it yours', route: { name: 'feedback' }, about: 'Tell us what would help. We read every request.', used: (_f, a) => ev(a, 'request') },
];

export interface Badge { id: string; name: string; about: string; icon: string; earned: (f: Facts, a: Activity) => boolean }

const c = (a: Activity, e: EventName) => a.counts[e] ?? 0;

/** Milestones only ever accumulate. Wording celebrates effort, never volume for its own sake. */
export const BADGES: Badge[] = [
  { id: 'first-note', name: 'First note', icon: 'note', about: 'Noted your first moment.', earned: (f) => f.entries >= 1 },
  { id: 'steady', name: 'Steady noticer', icon: 'list', about: 'Noted 10 moments.', earned: (f) => f.entries >= 10 },
  { id: 'deep-listener', name: 'Deep listener', icon: 'heart', about: 'Noted 50 moments. That’s a lot of care.', earned: (f) => f.entries >= 50 },
  { id: 'hindsight', name: 'Hindsight', icon: 'sparkle', about: 'Added a reflection to an earlier moment.', earned: (f) => f.reflections >= 1 },
  { id: 'all-of-us', name: 'All of us', icon: 'people', about: 'Added a part of your system.', earned: (f) => f.parts >= 1 },
  { id: 'pause', name: 'Took a pause', icon: 'leaf', about: 'Used the Pause tools.', earned: (_f, a) => c(a, 'pause') >= 1 },
  { id: 'calm-practice', name: 'Calm practice', icon: 'leaf', about: 'Used Pause 10 times.', earned: (_f, a) => c(a, 'pause') >= 10 },
  { id: 'first-box', name: 'First box', icon: 'box', about: 'Built a box with box breathing.', earned: (_f, a) => c(a, 'box-breath') >= 1 },
  { id: 'box-builder', name: 'Box builder', icon: 'box', about: 'Built 50 boxes with box breathing.', earned: (_f, a) => c(a, 'box-breath') >= 50 },
  { id: 'calm-moment', name: 'A moment of calm', icon: 'leaf', about: 'Spent time in the Calm space.', earned: (_f, a) => c(a, 'calm') >= 1 },
  { id: 'calm-habit', name: 'Calm habit', icon: 'leaf', about: 'Visited the Calm space 10 times.', earned: (_f, a) => c(a, 'calm') >= 10 },
  { id: 'checked-in', name: 'Checked in', icon: 'sparkle', about: 'Answered a gentle check-in.', earned: (f) => f.checkins >= 1 },
  { id: 'honest-30', name: 'Honest with myself', icon: 'heart', about: 'Answered 30 check-ins.', earned: (f) => f.checkins >= 30 },
  { id: 'what-helps', name: 'Found what helps', icon: 'check', about: 'Marked an idea as helpful.', earned: (f) => f.helped >= 1 },
  { id: 'ritual-keeper', name: 'Ritual keeper', icon: 'sparkle', about: 'Added your own healthy ritual.', earned: (f) => f.rituals >= 1 },
  { id: 'safety-net', name: 'Safety net', icon: 'people', about: 'Saved a support contact.', earned: (f) => f.contacts >= 1 },
  { id: 'mapped', name: 'Mapped my support', icon: 'heart', about: 'Set up your support profile.', earned: (f) => f.supportProfile },
  { id: 'planner', name: 'Planner', icon: 'clock', about: 'Added an appointment.', earned: (f) => f.appointments >= 1 },
  { id: 'shared', name: 'Shared with care', icon: 'share', about: 'Exported a summary for someone who helps you.', earned: (_f, a) => c(a, 'export') >= 1 },
  { id: 'garden-visit', name: 'Gardener', icon: 'leaf', about: 'Visited your Mood Garden.', earned: (_f, a) => c(a, 'garden') >= 1 },
  { id: 'care-team', name: 'My care team', icon: 'shield', about: 'Shared a read-only view with someone who helps you.', earned: (f) => f.careShares >= 1 },
  { id: 'circle', name: 'Not alone', icon: 'people', about: 'Added someone to your trust circle.', earned: (f) => f.circlePeople >= 1 },
  { id: 'good-witness', name: 'Good witness', icon: 'note', about: 'Added what you noticed for someone in your circle.', earned: (f) => f.observationsGiven >= 1 },
  { id: 'kind-word', name: 'Kind word', icon: 'heart', about: 'Sent an anonymous kind note.', earned: (_f, a) => c(a, 'kind-sent') >= 1 },
  { id: 'kindness-10', name: 'Kindness spreader', icon: 'heart', about: 'Sent 10 kind notes.', earned: (_f, a) => c(a, 'kind-sent') >= 10 },
  { id: 'received', name: 'Someone’s thinking of you', icon: 'sparkle', about: 'Received a kind note.', earned: (_f, a) => c(a, 'kind-received') >= 1 },
  { id: 'pay-forward', name: 'Paid it forward', icon: 'heart', about: 'Did a small act of kindness.', earned: (_f, a) => c(a, 'kind-act') >= 1 },
  { id: 'pay-forward-7', name: 'Ripple effect', icon: 'heart', about: 'Did 7 small acts of kindness.', earned: (_f, a) => c(a, 'kind-act') >= 7 },
  { id: 'safety-plan', name: 'A plan for hard days', icon: 'shield', about: 'Made a safety plan.', earned: (f) => f.safetyPlan },
  { id: 'comfort', name: 'Comfort keeper', icon: 'box', about: 'Started a comfort kit.', earned: (f) => f.comfortItems >= 1 },
  { id: 'body-week', name: 'Caring for my body', icon: 'body', about: 'Logged body basics on 7 days.', earned: (f) => f.bodyDays >= 7 },
  { id: 'inner-voice', name: 'Inner voices heard', icon: 'board', about: 'Posted on the inner board.', earned: (f) => f.boardNotes >= 1 },
  { id: 'prepared', name: 'Prepared', icon: 'clipboard', about: 'Prepared for a session.', earned: (f) => f.preps >= 1 },
  { id: 'reached-out', name: 'Reached out', icon: 'bell', about: 'Asked someone to check on you. That takes courage.', earned: (f) => f.checkOnSent >= 1 },
  { id: 'explorer', name: 'Explorer', icon: 'sparkle', about: 'Took the quick tour.', earned: (_f, a) => c(a, 'tour') >= 1 },
  { id: 'your-voice', name: 'Your voice', icon: 'note', about: 'Suggested a feature.', earned: (_f, a) => c(a, 'request') >= 1 },
];

export function emptyActivity(id: string): Activity {
  return { id, firsts: {}, counts: {}, badges: {}, dismissedTips: [], lastTipAt: null };
}

export function recordEvent(a: Activity, e: EventName, now = Date.now()): Activity {
  return { ...a, firsts: { ...a.firsts, [e]: a.firsts[e] ?? now }, counts: { ...a.counts, [e]: (a.counts[e] ?? 0) + 1 } };
}

export function progress(f: Facts, a: Activity) {
  const used = FEATURES.filter((x) => x.used(f, a));
  const earned = BADGES.filter((b) => b.earned(f, a));
  const newBadges = earned.filter((b) => !a.badges[b.id]);
  return { used, total: FEATURES.length, earned, newBadges };
}

const DAY = 86400000;

/** The next feature worth suggesting, or null. At most weekly, never in the first two days. */
export function nextTip(f: Facts, a: Activity, startedAt: number, now = Date.now()): Feature | null {
  if (now - startedAt < 2 * DAY) return null;
  if (a.lastTipAt && now - a.lastTipAt < 7 * DAY) return null;
  return FEATURES.filter((x) => x.tip && x.tipPriority && !x.used(f, a) && !a.dismissedTips.includes(x.id))
    .sort((x, y) => x.tipPriority! - y.tipPriority!)[0] ?? null;
}
