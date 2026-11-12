#!/usr/bin/env node
// Cut a release: bump the version and move "Unreleased" changes into it.
//   npm run release -- patch|minor|major
// Then commit, merge, and push the tag the script prints (CI publishes the GitHub release).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const kind = process.argv[2];
if (!['patch', 'minor', 'major'].includes(kind)) {
  console.error('Usage: npm run release -- patch|minor|major');
  process.exit(1);
}
// Load the TypeScript helpers through Vite so there is one implementation.
const vite = await createServer({ root: resolve(here, '..'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { bumpVersion, cutRelease } = await vite.ssrLoadModule('/src/lib/release.ts');
  const pkgPath = resolve(here, '../package.json');
  const logPath = resolve(here, '../../CHANGELOG.md');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const next = bumpVersion(pkg.version, kind);
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(logPath, cutRelease(readFileSync(logPath, 'utf8'), next, today));
  pkg.version = next;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  const readmePath = resolve(here, '../../README.md');
  writeFileSync(readmePath, readFileSync(readmePath, 'utf8').replace(/Current version: \d+\.\d+\.\d+/, `Current version: ${next}`));
  console.log(`Released ${next} (${today}) in CHANGELOG.md, package.json and README.md.`);
  console.log(`Next: commit "Release v${next}", merge to main, then: git tag v${next} && git push origin v${next}`);
  collateralReminder(readFileSync(logPath, 'utf8'), readFileSync(resolve(here, '../../docs/COLLATERAL.md'), 'utf8'));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await vite.close();
}

/** Remind when a full collateral audit is due (docs/COLLATERAL.md): a minor/major release since the last audit, or 3+ patches. */
function collateralReminder(changelog, collateral) {
  const audited = [...collateral.matchAll(/^\| (\d+\.\d+\.\d+) \|/gm)].map((m) => m[1]).pop();
  if (!audited) return;
  const num = (v) => v.split('.').map(Number);
  const newer = (a, b) => { const [x, y] = [num(a), num(b)]; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
  const since = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]).filter((v) => newer(v, audited));
  const featureRelease = since.some((v) => { const [ma, mi] = num(v); const [a0, a1] = num(audited); return ma > a0 || mi > a1; });
  if (featureRelease || since.length >= 3) {
    console.log(`\nCollateral audit due: ${since.length} release(s) since the last audit (${audited}), ${featureRelease ? 'including new features' : 'all patches'}.`);
    console.log('Follow docs/COLLATERAL.md: update help, tour, Explore, website, press materials and docs, then log the audit.');
  }
}
