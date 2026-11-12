import { describe, expect, it } from 'vitest';
import { CRISIS, RESOURCES, isZip, matchResources, smsHref } from './resources';

describe('support resources', () => {
  it('validates ZIP codes', () => {
    expect(isZip('43215')).toBe(true);
    expect(isZip(' 02139 ')).toBe(true);
    for (const z of ['4321', '432155', 'ABCDE', '']) expect(isZip(z)).toBe(false);
  });
  it('fills the ZIP only into verified links, encoded safely', () => {
    const did = RESOURCES.find((r) => r.id === 'pt-did')!;
    expect(did.zipUrl!('43215')).toBe('https://www.psychologytoday.com/us/therapists/43215?category=dissociative-disorders');
    expect(RESOURCES.filter((r) => r.zipUrl).map((r) => r.id).sort()).toEqual(['hrsa', 'pt-all', 'pt-did', 'pt-trauma']);
  });
  it('matches needs: DID first, low-cost brings health centers, everyone gets general options', () => {
    expect(matchResources(['did'], 'near')[0].id).toMatch(/^(pt-did|isstd)$/);
    expect(matchResources(['did'], 'near').map((r) => r.id)).toContain('pt-all');
    expect(matchResources(['low-cost'], 'near').map((r) => r.id)).toContain('hrsa');
    expect(matchResources(['veterans'], 'talk').map((r) => r.id)).toContain('veterans');
    expect(matchResources(['did'], 'talk').map((r) => r.id)).not.toContain('veterans');
    expect(matchResources([], 'near').length).toBeGreaterThan(0);
    expect(matchResources([], 'learn').length).toBeGreaterThan(3);
  });
  it('has well-formed contact details', () => {
    for (const r of [...CRISIS, ...RESOURCES]) {
      expect(r.url).toMatch(/^https:\/\//);
      if (r.call) expect(r.call).toMatch(/^\d{3,11}$/);
    }
    expect(smsHref({ to: '741741', body: 'HOME' })).toBe('sms:741741?&body=HOME');
  });
});
