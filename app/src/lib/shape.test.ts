import { describe, expect, it } from 'vitest';
import { isShapeRequest, shapeProblem, shapeRequest, SHAPE_TITLE, type ShapeForm } from './shape';

const form: ShapeForm = { roles: ['lived', 'family'], way: 'written', contact: ' sam@example.com ', name: 'Sam', note: 'Evenings are best.' };

describe('help shape iDID', () => {
  it('asks for a role and a reply address', () => {
    expect(shapeProblem({ ...form, roles: [] })).toMatch(/at least one/);
    expect(shapeProblem({ ...form, contact: 'not an email' })).toMatch(/email/);
    expect(shapeProblem(form)).toBeNull();
  });

  it('becomes an ordinary request the team can find', () => {
    const r = shapeRequest(form, '0.18.0');
    expect(r.kind).toBe('other');
    expect(r.title).toBe(SHAPE_TITLE);
    expect(r.title.length).toBeLessThanOrEqual(140);
    expect(r.details).toContain('Reply to: sam@example.com');
    expect(r.details).toContain('Roles: I live with dissociation or DID; I support a partner, family member or friend');
    expect(r.details).toContain('Prefers: Written feedback only');
    expect(r.details).toContain('Note: Evenings are best.');
    expect(isShapeRequest(r)).toBe(true);
  });

  it('keeps details within the server limit', () => {
    expect(shapeRequest({ ...form, note: 'x'.repeat(5000) }, '1').details.length).toBe(4000);
  });
});
