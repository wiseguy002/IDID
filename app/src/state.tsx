import { createContext, useContext } from 'react';
import type { Member, Part, Settings } from './types';

export type Route =
  | { name: 'home' }
  | { name: 'log'; entryId?: string }
  | { name: 'timeline' }
  | { name: 'entry'; id: string }
  | { name: 'observe'; id: string }
  | { name: 'insights' }
  | { name: 'circle' }
  | { name: 'share' }
  | { name: 'settings' }
  | { name: 'pause' }
  | { name: 'appointments' }
  | { name: 'account' }
  | { name: 'support' }
  | { name: 'changelog' }
  | { name: 'explore' }
  | { name: 'kindness' }
  | { name: 'feedback' }
  | { name: 'admin' }
  | { name: 'safety' }
  | { name: 'board' }
  | { name: 'body' }
  | { name: 'comfort' }
  | { name: 'calm' }
  | { name: 'prep'; appointmentId?: string }
  | { name: 'join'; invite: string }
  /** Care team & shared views. memberId/newName prefill a new view; fromCircle is the account to move out of the circle. */
  | { name: 'careteam'; memberId?: string; newName?: string; fromCircle?: string }
  | { name: 'help'; topic?: string };

export interface AppCtx {
  settings: Settings;
  members: Member[];
  parts: Part[];
  me: Member | null;
  route: Route;
  go: (r: Route) => void;
  toast: (msg: string) => void;
  /** Open the "How are you doing?" check-in now. */
  checkIn: () => void;
  /** Open the quick tour. */
  openTour: () => void;
  /** Open "Check on me". */
  checkOn: () => void;
}

export const Ctx = createContext<AppCtx | null>(null);
export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('no ctx');
  return c;
}

/** Entries visible to a member: their own, or circle-visible ones if they can view. */
export function canSee(me: Member | null, e: { subjectId: string; authorId: string; visibility: string }) {
  if (!me) return false;
  if (e.subjectId === me.id || e.authorId === me.id) return true;
  return me.canView && e.visibility === 'circle';
}
