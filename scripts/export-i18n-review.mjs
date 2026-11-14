// Writes docs/i18n-review-es.csv: every Spanish string beside its English source and where it's used,
// with empty columns for a reviewer's suggestion and notes. Open it in Google Sheets or Excel.
//   node scripts/export-i18n-review.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'app/src');
const esText = readFileSync(join(src, 'i18n/es.ts'), 'utf8');

// Pull 'English': 'Spanish' pairs (either quote style) from es.ts, keeping the section comments as areas.
const pairs = [];
let area = '';
const str = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"`;
const rx = new RegExp(String.raw`^\s*(${str})\s*:\s*(${str}),?\s*$`);
const unq = (s) => s.slice(1, -1).replace(/\\(['"\\])/g, '$1');
for (const line of esText.split('\n')) {
  const sec = line.match(/^\s*\/\/ -+ (.+?) -+/);
  if (sec) { area = sec[1]; continue; }
  const m = line.match(rx);
  if (m) pairs.push({ area, en: unq(m[1]), es: unq(m[2]) });
}

// Where each English string appears in the app.
const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) && !p.includes('/i18n/') ? [p] : []; });
const sources = files(src).map((f) => [relative(root, f), readFileSync(f, 'utf8')]);
// Prefer files that pass the string to t()/tx()/tn(); fall back to any file containing it (lists, shared labels).
// The English text as it appears in source, as a single- or double-quoted literal (backslashes first, then quotes).
const literal = (en, q) => q + en.replace(/\\/g, '\\\\').replaceAll(q, '\\' + q) + q;
const marked = (s, en) => [literal(en, "'"), literal(en, '"')].some((q) => ['t(', 'tx(', 'tn('].some((fn) => s.includes(fn + q)) || s.includes(`, ${q}`));
const where = (en) => {
  const hit = sources.filter(([, s]) => marked(s, en));
  const list = hit.length ? hit : sources.filter(([, s]) => s.includes(`'${en}'`) || s.includes(`"${en}"`));
  return list.map(([f]) => f.replace('app/src/', '')).slice(0, 3).join('; ') || 'shared list';
};

const csv = (v) => `"${String(v).replace(/"/g, '""')}"`;
const lines = [['Area', 'English', 'Spanish (current)', 'Used in', 'Suggested Spanish (reviewer)', 'Notes (reviewer)'].map(csv).join(',')];
for (const p of pairs) lines.push([p.area, p.en, p.es, where(p.en), '', ''].map(csv).join(','));
writeFileSync(join(root, 'docs/i18n-review-es.csv'), '\ufeff' + lines.join('\r\n') + '\r\n');
console.log(`Wrote docs/i18n-review-es.csv with ${pairs.length} strings.`);
