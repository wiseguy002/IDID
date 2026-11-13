/**
 * A deliberately small translation layer.
 *
 * Text is written in English in the code and wrapped in t(). The English sentence is the key, so screens stay
 * readable and anything not yet translated simply shows in English. Spanish lives in ./es.ts. A test
 * (i18n.test.ts) fails if a t('…') call in a translated file has no Spanish version.
 *
 * Placeholders use braces: t('Support near {name}', { name }).
 */
import { ES } from './es';

export type Lang = 'en' | 'es';
export const LANGS: { value: Lang; label: string }[] = [{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }];

let lang: Lang = 'en';

/** The browser's preferred language, if we support it. */
export function detectLang(langs: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []): Lang {
  const first = langs.find((l) => /^(en|es)\b/i.test(l));
  return first && /^es/i.test(first) ? 'es' : 'en';
}

export function setLang(l: Lang) {
  lang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l === 'es' ? 'es-US' : 'en-US';
}
export const getLang = () => lang;
/** Locale for dates and numbers. */
export const locale = () => (lang === 'es' ? 'es-US' : 'en-US');

const fill = (s: string, vars?: Record<string, string | number>) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

export function t(en: string, vars?: Record<string, string | number>): string {
  return fill(lang === 'es' ? ES[en] ?? en : en, vars);
}

/** Choose between a singular and plural English sentence, then translate. */
export function tn(n: number, one: string, many: string, vars?: Record<string, string | number>): string {
  return t(n === 1 ? one : many, { n, ...vars });
}

/** Marks an English string for translation where it's defined (lists, constants); translate it later with t(). */
export const tx = (en: string) => en;
