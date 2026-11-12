// Assembles site/pages/*.html with the shared header and footer into site/dist/.
// Each page starts with a front-matter comment:
//   <!-- title: … | description: … | keywords: … -->   (keywords optional)
//
// The site's Content-Security-Policy (see _headers) allows styles only from our own stylesheet, so
// inline style="…" attributes and <style> blocks would be silently ignored in browsers. The build
// moves every one of them into generated classes in site.css, keeping the strict policy.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsonLd } from './seo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const d of ['assets', 'press', 'errors']) cpSync(join(root, d), join(out, d), { recursive: true });
for (const f of ['_headers', '_redirects', 'robots.txt', 'site.webmanifest']) cpSync(join(root, f), join(out, f));
cpSync(join(root, 'well-known'), join(out, '.well-known'), { recursive: true });

const head = readFileSync(join(root, 'partials/head.html'), 'utf8');
const foot = readFileSync(join(root, 'partials/foot.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const DEFAULT_KEYWORDS = 'dissociation journal, DID app, dissociative identity disorder, OSDD, trauma journal, mental health journal, private encrypted journal';

// ---------- Inline styles → generated classes ----------
const generated = new Map(); // css declarations → class name
const classFor = (decls) => {
  const d = decls.split(';').map((x) => x.trim()).filter(Boolean).map((x) => (/!important$/.test(x) ? x : `${x} !important`)).join(';');
  if (!generated.has(d)) generated.set(d, `is-${createHash('sha1').update(d).digest('hex').slice(0, 7)}`);
  return generated.get(d);
};
const extraCss = [];
function moveStyles(html) {
  // <style> blocks (press documents) move into the stylesheet as they are.
  html = html.replace(/<style>([\s\S]*?)<\/style>\n?/g, (_, css) => { extraCss.push(css.trim()); return ''; });
  // style="…" attributes become a class (merged with any existing class on the element).
  return html.replace(/<([a-z][a-z0-9]*)(\s[^<>]*?)\sstyle="([^"]*)"([^<>]*)>/gi, (_, tag, before, decls, after) => {
    const cls = classFor(decls);
    let attrs = `${before}${after}`;
    if (/\sclass="/.test(attrs)) attrs = attrs.replace(/\sclass="([^"]*)"/, (_m, c) => ` class="${c} ${cls}"`);
    else attrs = ` class="${cls}"${attrs}`;
    return `<${tag}${attrs}>`;
  }).replace(/<([a-z][a-z0-9]*)\sstyle="([^"]*)"([^<>]*)>/gi, (_, tag, decls, after) => {
    const cls = classFor(decls);
    if (/\sclass="/.test(after)) return `<${tag}${after.replace(/\sclass="([^"]*)"/, (_m, c) => ` class="${c} ${cls}"`)}>`;
    return `<${tag} class="${cls}"${after}>`;
  });
}

// ---------- Pages ----------
const pages = [];
const built = [];
for (const f of readdirSync(join(root, 'pages')).filter((x) => x.endsWith('.html'))) {
  const src = readFileSync(join(root, 'pages', f), 'utf8');
  const m = src.match(/^<!--([\s\S]*?)-->\n/);
  if (!m) throw new Error(`${f}: missing front-matter comment`);
  const meta = Object.fromEntries(m[1].split(/\s\|\s/).map((part) => { const i = part.indexOf(':'); return [part.slice(0, i).trim(), part.slice(i + 1).trim()]; }));
  if (!meta.title || !meta.description) throw new Error(`${f}: front matter needs title and description`);
  const name = f.replace(/\.html$/, '');
  const path = name === 'index' ? '/' : `/${name}`;
  const body = src.slice(m[0].length);
  let h = head.replace(/{{title}}/g, esc(meta.title)).replace(/{{description}}/g, esc(meta.description))
    .replace(/{{keywords}}/g, esc(meta.keywords ?? DEFAULT_KEYWORDS)).replace(/{{path}}/g, path)
    .replace('{{jsonld}}', name === '404' ? '' : jsonLd({ name, path, title: meta.title, description: meta.description, html: body }));
  for (const n of ['features', 'learn', 'privacy', 'share', 'press']) h = h.replace(`{{nav-${n}}}`, n === name ? 'aria-current="page"' : '');
  // The 404 page is reachable at /404 too: keep it out of search results.
  if (name === '404') h = h.replace(/<link rel="canonical"[^>]*>/, '').replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex">');
  built.push({ file: f, html: moveStyles(h + body + foot) });
  if (name !== '404') pages.push({ path, file: join('pages', f) });
}
const pressDocs = ['press/fact-sheet.html', 'press/press-release.html'].map((file) => ({ file, html: moveStyles(readFileSync(join(root, file), 'utf8')) }));

// ---------- Stylesheet (with generated classes) and the version stamp ----------
const css = [
  readFileSync(join(root, 'assets/site.css'), 'utf8').trimEnd(),
  '\n/* ---------- Generated by the build from inline styles (kept out of HTML for the CSP) ---------- */',
  ...extraCss,
  ...[...generated].map(([d, c]) => `.${c}{${d}}`),
].join('\n') + '\n';
writeFileSync(join(out, 'assets/site.css'), css);
// Content hash of the shared CSS/JS: stamped into asset URLs and the service worker's cache name.
const v = createHash('sha256').update(css).update(readFileSync(join(root, 'assets/site.js'))).digest('hex').slice(0, 10);
for (const p of built) writeFileSync(join(out, p.file), p.html.replace(/{{v}}/g, v));
for (const p of pressDocs) writeFileSync(join(out, p.file), p.html.replace('href="/assets/site.css"', `href="/assets/site.css?v=${v}"`));
writeFileSync(join(out, 'sw.js'), readFileSync(join(root, 'sw.js'), 'utf8').replace(/__V__/g, v));

// ---------- Sitemap, with each page's last change from git (or today, outside a git checkout) ----------
pages.push({ path: '/press/fact-sheet', file: 'press/fact-sheet.html' }, { path: '/press/press-release', file: 'press/press-release.html' });
const today = new Date().toISOString().slice(0, 10);
const lastmod = (file) => {
  try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim() || today; } catch { return today; }
};
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>https://idid.care${p.path}</loc><lastmod>${lastmod(p.file)}</lastmod></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${built.length} pages into site/dist/ (assets v=${v}; ${generated.size} inline styles moved to classes)`);
