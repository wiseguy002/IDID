import { store, uid, updateDevice, updatePrefs } from '../db';
import { PALETTE } from './defaults';
import type { Entry, Member, Part } from '../types';

export const SAMPLE_PASSPHRASE = 'sample circle';

/** Fills the app with a fictional circle so people can explore before using it for real. */
export async function loadSample() {
  const now = Date.now();
  const alex: Member = { id: uid(), name: 'Alex', role: 'self', tracked: true, canView: true, canObserve: true, color: PALETTE[0], createdAt: now };
  const sam: Member = { id: uid(), name: 'Sam', role: 'partner', tracked: false, canView: true, canObserve: true, color: PALETTE[1], createdAt: now + 1 };
  const jo: Member = { id: uid(), name: 'Dr. Jo', role: 'clinician', tracked: false, canView: true, canObserve: false, color: PALETTE[5], createdAt: now + 2 };
  const parts: Part[] = [
    { id: uid(), memberId: alex.id, name: 'Robin', pronouns: 'she/her', age: '7', role: 'little', color: PALETTE[3], createdAt: now },
    { id: uid(), memberId: alex.id, name: 'Kai', pronouns: 'he/him', role: 'protector', color: PALETTE[2], createdAt: now + 1 },
    { id: uid(), memberId: alex.id, name: 'Wren', pronouns: 'they/them', role: 'caretaker', color: PALETTE[7], createdAt: now + 2 },
  ];
  const [robin, kai, wren] = parts;
  const T = [
    { t: ['Loud noise', 'Crowds'], loc: 'Shop', f: [kai.id], mood: 2, fe: ['Anxious', 'Overwhelmed'], d: 'minutes', n: [sam.id] },
    { t: ['Conflict / raised voices'], loc: 'Home', f: [robin.id], mood: 1, fe: ['Scared', 'Young / small'], d: 'under-hour', n: [sam.id], lost: true },
    { t: ['Tiredness'], loc: 'Bedroom', f: [wren.id], mood: 3, fe: ['Foggy', 'Detached'], d: 'hours', n: [] },
    { t: ['A memory', 'Anniversary / date'], loc: 'Home', f: [robin.id], co: [wren.id], mood: 2, fe: ['Sad', 'Young / small'], d: 'hours', n: [sam.id] },
    { t: ['Work / school stress', 'Feeling criticised'], loc: 'Work', f: [kai.id], mood: 2, fe: ['Angry'], d: 'minutes', n: [] },
    { t: ['Bright lights', 'Crowds'], loc: 'Appointment', f: [], unk: true, mood: 3, fe: ['Numb', 'Confused'], d: 'moments', n: [], lost: true },
    { t: ['Being alone'], loc: 'Home', f: [wren.id], mood: 4, fe: ['Calm', 'Tired'], d: 'hours', n: [] },
    { t: ['A smell'], loc: 'Outdoors', f: [robin.id], mood: 2, fe: ['Scared'], d: 'minutes', n: [sam.id] },
  ];
  const entries: Entry[] = [];
  for (let i = 0; i < 26; i++) {
    const x = T[i % T.length];
    const at = now - (i * 2.6 + (i % 3) * 0.4) * 86400000 - ((i * 7) % 14) * 3600000 - 3 * 3600000;
    entries.push({
      id: uid(), subjectId: alex.id, authorId: i % 5 === 2 ? sam.id : alex.id, occurredAt: at, loggedAt: at + 1800000, updatedAt: at + 1800000,
      timeApprox: !!x.lost, location: x.loc, triggers: x.t, mood: Math.max(1, Math.min(5, x.mood + (i > 14 ? 0 : i % 2))), feelings: x.fe,
      frontingPartIds: x.f, frontingUnknown: !!x.unk, coFronting: !!x.co, coFrontPartIds: x.co ?? [], lostTime: !!x.lost,
      possibleCause: i % 4 === 0 ? 'Felt cornered — too many people talking at once.' : '', duration: x.d as Entry['duration'],
      noticedByIds: x.n, noticedByOthers: '', intensity: (i % 4) + 1, notes: i % 3 === 0 ? 'Grounding with a cold drink helped afterwards.' : '',
      visibility: 'circle', followUps: [],
    });
  }
  await store.putMany('parts', parts);
  await store.putMany('entries', entries);
  await store.putMany('observations', entries.filter((e) => e.noticedByIds.includes(sam.id)).slice(0, 6).map((e, i) => ({
    id: uid(), entryId: e.id, memberId: sam.id, status: i === 0 ? 'requested' as const : 'done' as const, requestedAt: e.loggedAt,
    respondedAt: i === 0 ? undefined : e.loggedAt + 7200000, noticed: i === 0 ? [] : ['Voice changed', 'Seemed younger'].slice(0, (i % 2) + 1),
    partIds: i === 0 ? [] : e.frontingPartIds, duration: i === 0 ? null : e.duration, present: i === 0 ? null : true,
    text: i === 0 ? '' : 'Went quiet and sat on the floor. Calmed down once I turned the TV off.',
  })));
  await updatePrefs({ circleName: 'Our circle' });
  updateDevice({ activeMemberId: alex.id, lastOpenedAt: null });
  await store.putMany('members', [alex, sam, jo]);
}
