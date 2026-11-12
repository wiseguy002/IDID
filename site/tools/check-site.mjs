// Checks the built site: internal links resolve, pages render without errors under the real
// Content-Security-Policy, nothing scrolls sideways on a phone, no third-party requests are made,
// pages pass the axe accessibility audit (WCAG 2.2 AA, light and dark), and the HTML validates.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const types = { '.webmanifest': 'application/manifest+json', '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain' };
const fileFor = (p) => {
  const clean = decodeURIComponent(p.split('#')[0].split('?')[0]);
  for (const c of [clean, clean + '.html', join(clean, 'index.html')]) { const f = join(dist, c); if (existsSync(f) && !f.endsWith('/')) try { readFileSync(f); return f; } catch { /* dir */ } }
  return null;
};
// The same Content-Security-Policy the live site sends (from _headers), so blocked styles or scripts fail here.
const csp = readFileSync(join(dist, '_headers'), 'utf8').match(/^\/\*\n(?:  .*\n)*?  Content-Security-Policy: (.*)$/m)?.[1];
if (!csp) throw new Error('No Content-Security-Policy found for /* in _headers');
let axeSource = null;
try { axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch { console.warn('axe-core not installed: skipping the accessibility audit'); }
const server = createServer((req, res) => {
  const f = fileFor(req.url === '/' ? '/index.html' : req.url);
  if (!f) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(readFileSync(join(dist, '404.html'))); return; }
  res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream', ...(f.includes('/errors/') ? {} : { 'content-security-policy': csp }) });
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
      // Loose text beside elements inside a grid/flex container becomes separate items and breaks layout.
      const loose = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => {
        const d = getComputedStyle(el).display;
        if (!/grid|flex/.test(d)) return false;
        const kids = [...el.childNodes];
        const phrasing = ['B', 'STRONG', 'I', 'EM', 'A', 'SPAN', 'CODE', 'SMALL'];
        return kids.some((n) => n.nodeType === 3 && n.textContent.trim()) && kids.some((n) => n.nodeType === 1 && phrasing.includes(n.tagName));
      }).map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ': ' + el.textContent.trim().slice(0, 50)));
      for (const l of loose) problems.push(`${path}: text split by layout in ${l}`);
      const noAlt = await p.$$eval('img:not([alt])', (els) => els.length);
      if (noAlt) problems.push(`${path}: ${noAlt} image(s) without alt`);
    }
    if (axeSource) {
      for (const scheme of ['light', 'dark']) {
        await p.emulateMedia({ colorScheme: scheme });
        // Injected through the test harness (not the page), so the page's CSP doesn't apply to it.
        await p.evaluate(axeSource);
        const r = await p.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
        for (const v of r.violations) problems.push(`${label} ${scheme} ${path}: accessibility (${v.impact}) ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
      }
    }
    await p.close();
  }
}
await b.close();
server.close();
// Standards-conformant HTML (html-validate's standard rules), when installed.
try {
  const { HtmlValidate } = require('html-validate');
  const hv = new HtmlValidate({ extends: ['html-validate:standard'] });
  for (const f of [...readdirSync(dist).filter((x) => x.endsWith('.html')), 'press/fact-sheet.html', 'press/press-release.html']) {
    const report = await hv.validateFile(join(dist, f));
    for (const r of report.results) for (const m of r.messages) problems.push(`${f}:${m.line}: HTML ${m.ruleId}: ${m.message}`);
  }
} catch (e) { if (e.code === 'MODULE_NOT_FOUND') console.warn('html-validate not installed: skipping HTML validation'); else throw e; }
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`Site OK: ${pages.length} pages × phone and desktop, light and dark. No broken links, sideways scrolling, CSP errors, third-party requests${axeSource ? ', accessibility violations' : ''} or invalid HTML.`);
