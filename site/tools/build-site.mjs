// Assembles site/pages/*.html with the shared header and footer into site/dist/.
// Each page starts with a front-matter comment: <!-- title: … | description: … -->
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const head = readFileSync(join(root, 'partials/head.html'), 'utf8');
const foot = readFileSync(join(root, 'partials/foot.html'), 'utf8');
// Content hash of the shared CSS/JS: stamped into asset URLs and the service worker's cache name.
const v = createHash('sha256').update(readFileSync(join(root, 'assets/site.css'))).update(readFileSync(join(root, 'assets/site.js'))).digest('hex').slice(0, 10);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const pages = [];
for (const f of readdirSync(join(root, 'pages')).filter((x) => x.endsWith('.html'))) {
  const src = readFileSync(join(root, 'pages', f), 'utf8');
  const m = src.match(/^<!--\s*title:\s*(.+?)\s*\|\s*description:\s*(.+?)\s*-->\n/s);
  if (!m) throw new Error(`${f}: missing front-matter comment`);
  const name = f.replace(/\.html$/, '');
  const path = name === 'index' ? '/' : `/${name}`;
  let h = head.replace(/{{title}}/g, esc(m[1])).replace(/{{description}}/g, esc(m[2])).replace(/{{path}}/g, path).replace(/{{v}}/g, v);
  for (const n of ['features', 'learn', 'privacy', 'share', 'press']) h = h.replace(`{{nav-${n}}}`, n === name ? 'aria-current="page"' : '');
  // The 404 page is reachable at /404 too: keep it out of search results.
  if (name === '404') h = h.replace(/<link rel="canonical"[^>]*>/, '<meta name="robots" content="noindex">');
  writeFileSync(join(out, f), h + src.slice(m[0].length) + foot);
  if (name !== '404') pages.push({ path, file: join('pages', f) });
}
for (const d of ['assets', 'press', 'errors']) cpSync(join(root, d), join(out, d), { recursive: true });
for (const f of ['_headers', '_redirects', 'robots.txt']) cpSync(join(root, f), join(out, f));
writeFileSync(join(out, 'sw.js'), readFileSync(join(root, 'sw.js'), 'utf8').replace(/__V__/g, v));
// Sitemap, with each page's last change from git (or today, outside a git checkout).
pages.push({ path: '/press/fact-sheet', file: 'press/fact-sheet.html' }, { path: '/press/press-release', file: 'press/press-release.html' });
const today = new Date().toISOString().slice(0, 10);
const lastmod = (file) => {
  try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim() || today; } catch { return today; }
};
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>https://idid.care${p.path}</loc><lastmod>${lastmod(p.file)}</lastmod></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${pages.length - 1} pages into site/dist/ (assets v=${v})`);
