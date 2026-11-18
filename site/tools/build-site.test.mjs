// Mainframe support in the website build: hidden pages and sections, menu/sitemap switches, markers removed.
// Runs the real build on a copy of site/ so the checked-in sources are never touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function build(change) {
  const dir = mkdtempSync(join(tmpdir(), 'site-'));
  cpSync(site, dir, { recursive: true, filter: (p) => !p.includes(`${site}/dist`) && !p.includes('node_modules') });
  change(dir);
  execFileSync(process.execPath, [join(dir, 'tools/build-site.mjs')], { stdio: 'pipe' });
  const read = (f) => readFileSync(join(dir, 'dist', f), 'utf8');
  return { dir, read, has: (f) => existsSync(join(dir, 'dist', f)) };
}
const edit = (dir, f, fn) => writeFileSync(join(dir, f), fn(readFileSync(join(dir, f), 'utf8')));
const setMeta = (src, extra) => src.replace(/ -->\n/, ` | ${extra} -->\n`);

test('built pages carry no Mainframe markers', () => {
  const b = build(() => {});
  for (const f of ['index.html', 'learn.html', 'privacy.html', '404.html']) {
    const html = b.read(f);
    assert.doesNotMatch(html, /data-cms|cms:area|cms:block/, f);
    assert.match(html, /988/, f);
  }
});

test('a hidden page is not built, leaves the sitemap, menu and footer', () => {
  const b = build((dir) => edit(dir, 'pages/learn.html', (s) => setMeta(s, 'status: hidden')));
  assert.equal(b.has('learn.html'), false);
  assert.doesNotMatch(b.read('sitemap.xml'), /idid\.care\/learn</);
  const home = b.read('index.html');
  const nav = home.match(/<nav class="main"[\s\S]*?<\/nav>/)[0], foot = home.match(/<footer[\s\S]*?<\/footer>/)[0];
  assert.doesNotMatch(nav, /href="\/learn"/);
  assert.doesNotMatch(foot, /href="\/learn/);
  assert.match(nav, /href="\/privacy"/);
  assert.match(foot, /href="\/privacy"/);
});

test('nav: no keeps the page but drops its top-menu link; sitemap: no drops it from the sitemap', () => {
  const b = build((dir) => {
    edit(dir, 'pages/press.html', (s) => setMeta(s, 'nav: no'));
    edit(dir, 'pages/terms.html', (s) => setMeta(s, 'sitemap: no'));
  });
  assert.equal(b.has('press.html'), true);
  const nav = b.read('index.html').match(/<nav class="main"[\s\S]*?<\/nav>/)[0];
  assert.doesNotMatch(nav, /href="\/press"/);
  assert.match(nav, /href="\/learn"/);
  assert.doesNotMatch(b.read('sitemap.xml'), /idid\.care\/terms</);
  assert.match(b.read('sitemap.xml'), /idid\.care\/press</);
});

test('a hidden section is left out of the page', () => {
  const b = build((dir) => edit(dir, 'pages/index.html', (s) =>
    s.replace(/(<!-- cms:block id="faq"[^>]*-->\n)([\s\S]*?)(\n<!-- \/cms:block -->)/, '$1<template data-cms-hidden>$2</template>$3')));
  const home = b.read('index.html');
  assert.doesNotMatch(home, /Questions people ask/);
  assert.doesNotMatch(home, /<template/);
  assert.match(home, /Begin gently/);
});

test('a "|" written by Mainframe as &#124; shows as a bar, not as &amp;#124;', () => {
  const b = build((dir) => edit(dir, 'pages/terms.html', (s) => s.replace(/title: [^|]*\|/, 'title: Terms &#124; iDID |')));
  const html = b.read('terms.html');
  assert.match(html, /<title>Terms &#124; iDID<\/title>/);
  assert.doesNotMatch(html, /&amp;#124;/);
});

test('a bad status stops the build', () => {
  assert.throws(() => build((dir) => edit(dir, 'pages/terms.html', (s) => setMeta(s, 'status: draft'))));
});
