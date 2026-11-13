/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ES } from './es';
import { detectLang, getLang, setLang, t, tn } from './index';

const SRC = join(__dirname, '..');
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
});
/** English strings passed to t(), tx() or tn() in files that use the i18n layer. */
function marked(): Map<string, string> {
  const out = new Map<string, string>();
  const str = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"`;
  const rx = new RegExp(String.raw`\b(?:t|tx|tn)\(\s*(?:[^,'"()]+,\s*)?(${str})(?:\s*,\s*(${str}))?`, 'g');
  for (const f of files(SRC)) {
    const s = readFileSync(f, 'utf8');
    if (!/from '(\.\.?\/)+i18n'|from '\.\/i18n'/.test(s) || f.includes(`${'i18n'}/`)) continue;
    for (const m of s.matchAll(rx)) for (const g of [m[1], m[2]]) if (g) out.set(g.slice(1, -1).replace(/\\(['"])/g, '$1'), f.slice(SRC.length + 1));
  }
  return out;
}
const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n', () => {
  it('every marked string has a Spanish translation', () => {
    expect(marked().size).toBeGreaterThan(300); // the scan really found the marked text
    const missing = [...marked()].filter(([en]) => !(en in ES)).map(([en, f]) => `${f}: ${en}`);
    expect(missing).toEqual([]);
  });

  it('translations keep the same placeholders', () => {
    const bad = Object.entries(ES).filter(([en, es]) => holes(en).join() !== holes(es).join()).map(([en]) => en);
    expect(bad).toEqual([]);
  });

  it('falls back to English and fills placeholders', () => {
    setLang('es');
    expect(t('Welcome back')).toBe('Qué bueno verte de nuevo');
    expect(t('Not translated yet')).toBe('Not translated yet');
    expect(t('Support near {name}', { name: 'Ana' })).toBe('Apoyo cerca de Ana');
    expect(tn(1, '{n} day ago', '{n} days ago')).toBe('hace 1 día');
    expect(tn(3, '{n} day ago', '{n} days ago')).toBe('hace 3 días');
    setLang('en');
    expect(t('Support near {name}', { name: 'Ana' })).toBe('Support near Ana');
    expect(getLang()).toBe('en');
  });

  it('picks Spanish only when the browser prefers it', () => {
    expect(detectLang(['es-MX', 'en-US'])).toBe('es');
    expect(detectLang(['en-US', 'es-US'])).toBe('en');
    expect(detectLang(['fr-FR', 'es-ES'])).toBe('es');
    expect(detectLang(['fr-FR'])).toBe('en');
    expect(detectLang([])).toBe('en');
  });
});
