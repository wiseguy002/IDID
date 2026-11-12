/**
 * Fold one person into another. Used when someone joins a circle that already has a profile for
 * them (a family member set it up first): everything that pointed at their own profile moves to
 * the circle's profile, records keyed by person are combined without losing anything, and the
 * duplicate is removed.
 */
import type { Store } from '../data/store';
import type { Activity } from '../types';

const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** Keep what `target` has; fill its gaps from `source`; combine lists (objects with ids de-duplicated by id). */
export function fillGaps<T extends object>(target: T, source: T): T {
  const out: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const [k, v] of Object.entries(source)) {
    const t = out[k];
    if (empty(t)) out[k] = v;
    else if (Array.isArray(t) && Array.isArray(v)) {
      const seen = new Set(t.map((x) => (x && typeof x === 'object' && 'id' in x ? (x as { id: string }).id : JSON.stringify(x))));
      out[k] = [...t, ...v.filter((x) => !seen.has(x && typeof x === 'object' && 'id' in x ? (x as { id: string }).id : JSON.stringify(x)))];
    }
  }
  return out as T;
}

function mergeActivity(a: Activity, b: Activity, id: string): Activity {
  const min = (x: Record<string, number>, y: Record<string, number>) => {
    const o = { ...x };
    for (const [k, v] of Object.entries(y)) o[k] = k in o ? Math.min(o[k], v) : v;
    return o;
  };
  const counts = { ...a.counts };
  for (const [k, v] of Object.entries(b.counts)) counts[k] = (counts[k] ?? 0) + v;
  return { ...fillGaps(a, b), id, firsts: min(a.firsts, b.firsts), badges: min(a.badges, b.badges), counts, dismissedTips: [...new Set([...a.dismissedTips, ...b.dismissedTips])] };
}

/** Everything that referred to `fromId` now refers to `toId`; then `fromId` is removed. */
export async function mergeMember(store: Store, fromId: string, toId: string) {
  if (fromId === toId) return;
  const from = store.get('members', fromId);
  const to = store.get('members', toId);
  if (!from || !to) throw new Error('Unknown person');
  const sw = (id: string) => (id === fromId ? toId : id);
  const swAll = (ids: string[]) => [...new Set(ids.map(sw))];

  for (const p of store.all('parts')) if (p.memberId === fromId) await store.patch('parts', p.id, { memberId: toId });
  for (const e of store.all('entries')) {
    if (e.subjectId !== fromId && e.authorId !== fromId && !e.noticedByIds.includes(fromId) && !e.followUps.some((f) => f.memberId === fromId)) continue;
    await store.patch('entries', e.id, {
      subjectId: sw(e.subjectId), authorId: sw(e.authorId), noticedByIds: swAll(e.noticedByIds),
      followUps: e.followUps.map((f) => ({ ...f, memberId: sw(f.memberId) })),
    });
  }
  for (const o of store.all('observations')) if (o.memberId === fromId) await store.patch('observations', o.id, { memberId: toId });
  for (const c of store.all('contacts')) if (c.memberId === fromId) await store.patch('contacts', c.id, { memberId: toId });
  for (const c of store.all('checkins')) if (c.memberId === fromId) await store.patch('checkins', c.id, { memberId: toId });
  for (const a of store.all('appointments')) {
    if (a.createdBy === fromId || a.memberIds.includes(fromId)) await store.patch('appointments', a.id, { memberIds: swAll(a.memberIds), createdBy: sw(a.createdBy) });
  }
  for (const al of store.all('alerts')) {
    if (al.fromMemberId !== fromId && !al.toMemberIds.includes(fromId) && !(fromId in al.acks)) continue;
    const acks: Record<string, number> = {};
    for (const [k, v] of Object.entries(al.acks)) acks[sw(k)] = Math.min(acks[sw(k)] ?? v, v);
    await store.patch('alerts', al.id, { fromMemberId: sw(al.fromMemberId), toMemberIds: swAll(al.toMemberIds), acks });
  }
  for (const n of store.all('board')) if (n.memberId === fromId) await store.patch('board', n.id, { memberId: toId });
  for (const c of store.all('comfort')) if (c.memberId === fromId) await store.patch('comfort', c.id, { memberId: toId });
  for (const p of store.all('prep')) if (p.memberId === fromId) await store.patch('prep', p.id, { memberId: toId });
  for (const m of store.all('meds')) if (m.memberId === fromId) await store.patch('meds', m.id, { memberId: toId });

  // Records whose id is made from the person's id.
  for (const d of store.all('body').filter((b) => b.memberId === fromId)) {
    const id = d.id.replace(`body:${fromId}:`, `body:${toId}:`);
    const there = store.get('body', id);
    await store.put('body', there ? { ...fillGaps(there, { ...d, id }), id, memberId: toId } : { ...d, id, memberId: toId });
    await store.remove('body', d.id);
  }
  const plan = store.get('safety', `safety:${fromId}`);
  if (plan) {
    const id = `safety:${toId}`;
    const there = store.get('safety', id);
    await store.put('safety', there ? { ...fillGaps(there, { ...plan, id }), id, memberId: toId } : { ...plan, id, memberId: toId });
    await store.remove('safety', plan.id);
  }
  const act = store.get('activity', fromId);
  if (act) {
    const there = store.get('activity', toId);
    await store.put('activity', there ? mergeActivity(there, act, toId) : { ...act, id: toId });
    await store.remove('activity', fromId);
  }

  // The person: keep the circle's profile, linked to this account, missing details filled in.
  await store.put('members', {
    ...fillGaps(to, { ...from, id: toId }), id: toId,
    userId: to.userId ?? from.userId, tracked: to.tracked || from.tracked,
    canView: to.canView || from.canView, canObserve: to.canObserve || from.canObserve,
  });
  await store.remove('members', fromId);
}
