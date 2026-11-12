// Checks the built site: internal links resolve, pages render without errors,
// nothing scrolls sideways on a phone, and no third-party requests are made.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain' };
const fileFor = (p) => {
  const clean = decodeURIComponent(p.split('#')[0].split('?')[0]);
  for (const c of [clean, clean + '.html', join(clean, 'index.html')]) { const f = join(dist, c); if (existsSync(f) && !f.endsWith('/')) try { readFileSync(f); return f; } catch { /* dir */ } }
  return null;
};
const server = createServer((req, res) => {
  const f = fileFor(req.url === '/' ? '/index.html' : req.url);
  if (!f) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(readFileSync(join(dist, '404.html'))); return; }
  res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const port = server.address().port;
const origin = `http://localhost:${port}`;

const problems = [];
const pages = readdirSync(dist).filter((f) => f.endsWith('.html')).map((f) => '/' + (f === 'index.html' ? '' : f.replace(/\.html$/, '')));
pages.push('/press/press-release.html', '/press/fact-sheet.html');
const b = await chromium.launch();
for (const [w, h, label] of [[390, 844, 'phone'], [1280, 800, 'desktop']]) {
  for (const path of pages) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const external = [];
    p.on('request', (r) => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) external.push(r.url()); });
    p.on('pageerror', (e) => problems.push(`${label} ${path}: script error ${e.message}`));
    p.on('console', (m) => m.type() === 'error' && problems.push(`${label} ${path}: console ${m.text()}`));
    const r = await p.goto(origin + path);
    if (!r || r.status() !== 200) problems.push(`${label} ${path}: status ${r?.status()}`);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) problems.push(`${label} ${path}: scrolls sideways by ${overflow}px`);
    if (external.length) problems.push(`${label} ${path}: third-party requests ${external.join(', ')}`);
    if (label === 'phone') {
      const links = await p.$$eval('a[href], img[src], link[href], script[src]', (els) => els.map((e) => e.getAttribute('href') ?? e.getAttribute('src')));
      for (const l of links) {
        if (!l || /^(https?:|mailto:|tel:|sms:|#)/.test(l)) continue;
        const target = l.startsWith('/') ? l : new URL(l, origin + path).pathname;
        if (!fileFor(target === '/' ? '/index.html' : target)) problems.push(`${path}: broken link ${l}`);
      }
      const noAlt = await p.$$eval('img:not([alt])', (els) => els.length);
      if (noAlt) problems.push(`${path}: ${noAlt} image(s) without alt`);
    }
    await p.close();
  }
}
await b.close();
server.close();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`Site OK: ${pages.length} pages × phone and desktop. No broken links, sideways scrolling, errors or third-party requests.`);
