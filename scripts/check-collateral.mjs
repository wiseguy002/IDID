#!/usr/bin/env node
// Keeps help, website, press and docs in step with the app. Run from anywhere:
//   node scripts/check-collateral.mjs            check (CI runs this on every pull request)
//   node scripts/check-collateral.mjs --matrix   also print which material mentions which feature
//
// Fails when:
//   1. a feature in docs/features.json isn't described in a material listed in its "requiredIn", or
//   2. a released changelog entry that starts with a bold feature name (- **Name** …) under
//      "### Added" isn't registered in docs/features.json (so new features can't ship undocumented).
// See docs/COLLATERAL.md for the full audit procedure.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(readFileSync(join(root, 'docs/features.json'), 'utf8'));
const text = Object.fromEntries(Object.entries(registry.materials).map(([k, p]) => [k, readFileSync(join(root, p), 'utf8').toLowerCase()]));
const problems = [];

// 1. Every feature is described where it must be.
for (const f of registry.features) {
  const rx = new RegExp(f.match, 'i');
  for (const m of f.requiredIn) {
    if (!(m in text)) problems.push(`docs/features.json: "${f.name}" lists unknown material "${m}"`);
    else if (!rx.test(text[m])) problems.push(`"${f.name}" isn't described in ${m} (${registry.materials[m]})`);
  }
}

// 2. Every released feature in the changelog is registered.
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const released = changelog.slice(changelog.search(/^## \[\d/m)); // skip the intro and Unreleased
const registered = new Set(registry.features.flatMap((f) => f.changelog ?? []).map((n) => n.toLowerCase()));
let version = '';
let section = '';
for (const line of released.split('\n')) {
  const v = line.match(/^## \[([^\]]+)\]/); if (v) { version = v[1]; continue; }
  const s = line.match(/^### (.+)/); if (s) { section = s[1]; continue; }
  const m = section === 'Added' && line.match(/^- \*\*([^*]+)\*\*/);
  if (m && !registered.has(m[1].toLowerCase())) problems.push(`CHANGELOG ${version}: "${m[1]}" isn't in docs/features.json. Register it (with where it must be described) and document it.`);
}

if (process.argv.includes('--matrix')) {
  const cols = Object.keys(text);
  console.log('feature'.padEnd(34) + cols.map((c) => c.slice(0, 8).padStart(9)).join(''));
  for (const f of registry.features) {
    const rx = new RegExp(f.match, 'i');
    console.log(f.name.slice(0, 33).padEnd(34) + cols.map((c) => (rx.test(text[c]) ? (f.requiredIn.includes(c) ? '✓ req' : '✓') : (f.requiredIn.includes(c) ? 'MISSING' : '·')).padStart(9)).join(''));
  }
}
if (problems.length) {
  console.error(`Collateral check: ${problems.length} problem(s)\n- ` + problems.join('\n- '));
  process.exit(1);
}
console.log(`Collateral OK: ${registry.features.length} features described in all ${registry.features.reduce((n, f) => n + f.requiredIn.length, 0)} required places; every released feature is registered.`);
