#!/usr/bin/env node
// Prints the CHANGELOG.md notes for a version (default: package.json's), for GitHub releases.
//   node scripts/release-notes.mjs [version]
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const vite = await createServer({ root: resolve(here, '..'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { notesFor } = await vite.ssrLoadModule('/src/lib/release.ts');
  const version = process.argv[2] ?? JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8')).version;
  process.stdout.write(notesFor(readFileSync(resolve(here, '../../CHANGELOG.md'), 'utf8'), version) + '\n');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await vite.close();
}
