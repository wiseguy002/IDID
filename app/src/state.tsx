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
  | { name: 'join'; invite: string };

export interface AppCtx {
  settings: Settings;
  members: Member[];
  parts: Part[];
  me: Member | null;
  route: Route;
  go: (r: Route) => void;
  toast: (msg: string) => void;
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
