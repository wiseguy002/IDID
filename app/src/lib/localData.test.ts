import { describe, expect, it } from 'vitest';
import { clearLocalData } from './localData';

const fake = (init: Record<string, string>) => {
  const m = new Map(Object.entries(init));
  return { m, get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => { m.delete(k); } };
};

describe('delete all data', () => {
  it('removes everything iDID saved on this device, including unsent requests', () => {
    const s = fake({ 'idid.requests.queue': '[{"details":"private"}]', 'idid.device': '{}', 'idid.role.abc': 'owner', 'idid.kindact.done': 'x', 'sb-abc-auth-token': '{}', other: 'keep' });
    clearLocalData(s);
    expect([...s.m.keys()]).toEqual(['other']);
  });
});
