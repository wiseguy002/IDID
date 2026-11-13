import { describe, expect, it } from 'vitest';
import { clearTally, countUse, isoWeek, readTally, sendDue, takeDue, type Tally } from './counts';
import { anonRpc } from '../sync/supabase';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };
const MON = new Date(2026, 10, 9, 10).getTime(); // Monday 9 Nov 2026
const WEEK = 7 * 86400000;

describe('anonymous counts', () => {
  it('names ISO weeks', () => {
    expect(isoWeek(MON)).toBe('2026-W46');
    expect(isoWeek(new Date(2026, 0, 1).getTime())).toBe('2026-W01');
    expect(isoWeek(new Date(2027, 0, 1).getTime())).toBe('2026-W53');
  });

  it('tallies known screens only, capped', () => {
    const s = mem();
    countUse('front', MON, s); countUse('front', MON, s); countUse('missed', MON, s);
    countUse('not-a-screen', MON, s); countUse('Dear diary, today…', MON, s);
    expect(readTally(s)).toEqual({ week: '2026-W46', counts: { front: 2, missed: 1 } });
    for (let i = 0; i < 250; i++) countUse('home', MON, s);
    expect(readTally(s)!.counts.home).toBe(200);
  });

  it('sends only finished weeks, once', async () => {
    const s = mem();
    countUse('front', MON, s);
    expect(takeDue(MON, s)).toBeNull();
    const sent: Tally[] = [];
    expect(await sendDue(async (t) => { sent.push(t); }, MON + WEEK, s)).toBe(true);
    expect(sent).toEqual([{ week: '2026-W46', counts: { front: 1 } }]);
    expect(await sendDue(async (t) => { sent.push(t); }, MON + WEEK, s)).toBe(false);
  });

  it('keeps last week safe while counting the new one, and retries after a failure', async () => {
    const s = mem();
    countUse('front', MON, s);
    countUse('voice', MON + WEEK, s);
    expect(await sendDue(async () => { throw new Error('offline'); }, MON + WEEK, s)).toBe(false);
    const sent: Tally[] = [];
    await sendDue(async (t) => { sent.push(t); }, MON + WEEK, s);
    expect(sent[0]).toEqual({ week: '2026-W46', counts: { front: 1 } });
    expect(readTally(s)).toEqual({ week: '2026-W47', counts: { voice: 1 } });
  });

  it('forgets everything when turned off', () => {
    const s = mem();
    countUse('front', MON, s); countUse('voice', MON + WEEK, s);
    clearTally(s);
    expect(s.m.size).toBe(0);
  });

  it('sends without the signed-in session', async () => {
    let url = '', init: RequestInit = {};
    const fake = (async (u: string, i: RequestInit) => { url = u; init = i; return new Response('true'); }) as unknown as typeof fetch;
    await anonRpc('add_feature_counts', { p_week: '2026-W46', p_counts: { front: 1 } }, fake, 'https://x.supabase.co', 'anon-key');
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/add_feature_counts');
    expect(init.headers).toEqual({ apikey: 'anon-key', Authorization: 'Bearer anon-key', 'Content-Type': 'application/json' });
    expect(init.credentials).toBe('omit');
    expect(JSON.parse(init.body as string)).toEqual({ p_week: '2026-W46', p_counts: { front: 1 } });
    await expect(anonRpc('x', {}, fake, '', '')).rejects.toThrow();
  });
});
