/**
 * "Help shape iDID": an opt-in way to volunteer for the lived-experience council or clinical advisors
 * (docs/ADVISORY_GROUP.md). It travels as an ordinary feature request (kind 'other', fixed title) so it needs
 * no new server table; the iDID team reads it, so it is NOT end-to-end encrypted, and the form says so.
 */
import type { RequestDraft } from '../sync/community';

export const SHAPE_TITLE = 'Help shape iDID: volunteer';

export type ShapeRole = 'lived' | 'family' | 'peer' | 'clinician';
export const SHAPE_ROLES: { value: ShapeRole; label: string }[] = [
  { value: 'lived', label: 'I live with dissociation or DID' },
  { value: 'family', label: 'I support a partner, family member or friend' },
  { value: 'peer', label: 'I work as a peer support specialist' },
  { value: 'clinician', label: 'I’m a therapist or other clinician' },
];

export type ShapeWay = 'calls' | 'written' | 'either';
export const SHAPE_WAYS: { value: ShapeWay; label: string }[] = [
  { value: 'either', label: 'Either' },
  { value: 'calls', label: 'Short video or phone calls' },
  { value: 'written', label: 'Written feedback only' },
];

export interface ShapeForm {
  roles: ShapeRole[];
  way: ShapeWay;
  /** How the team can reach them: an email address. Required, because sign-in emails aren't visible to the team. */
  contact: string;
  /** What they'd call themselves: a first name or pseudonym. */
  name: string;
  note: string;
}

export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export function shapeProblem(f: ShapeForm): string | null {
  if (!f.roles.length) return 'Choose at least one that fits you.';
  if (!validEmail(f.contact)) return 'Add an email address we can reply to.';
  return null;
}

export function shapeRequest(f: ShapeForm, appVersion: string): RequestDraft {
  const label = (r: ShapeRole) => SHAPE_ROLES.find((x) => x.value === r)?.label ?? r;
  const details = [
    `Roles: ${f.roles.map(label).join('; ')}`,
    `Prefers: ${SHAPE_WAYS.find((w) => w.value === f.way)?.label ?? f.way}`,
    `Call me: ${f.name.trim() || '(not given)'}`,
    `Reply to: ${f.contact.trim()}`,
    f.note.trim() ? `Note: ${f.note.trim()}` : '',
  ].filter(Boolean).join('\n').slice(0, 4000);
  return { kind: 'other', title: SHAPE_TITLE, details, app_version: appVersion };
}

export const isShapeRequest = (r: { title: string }) => r.title === SHAPE_TITLE;
