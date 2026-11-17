// Copied from wiseguy002/weDID tools/check-markers.mjs (paths: optional profile entries are skipped when absent).
// Checks Mainframe markers (contract §2-4) in page sources, partials and templates.
//   node tools/check-markers.mjs            check site/pages, site/partials, site/templates
//   node tools/check-markers.mjs --profile  also check mainframe.json (paths exist, theme contrast ≥ 4.5:1)
// Exit 1 with a list of problems, 0 when clean. No packages needed.
import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TYPES = new Set(['text', 'rich', 'link', 'image']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RICH_TAGS = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote', 'br']);
const URL_OK = /^(https?:|mailto:|sms:|tel:|\/(?!\/)|#)/;
const attrs = (s) => Object.fromEntries([...s.matchAll(/([a-zA-Z:-]+)(?:="([^"]*)")?/g)].map((m) => [m[1], m[2] ?? '']));

// Elements with their spans: [{ tag, attrs, start, openEnd, closeStart, end }]
function elements(html) {
  const out = [], stack = [];
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g)) {
    if (m[0].startsWith('<!--')) continue;
    const [, close, rawTag, rest] = m, tag = rawTag.toLowerCase();
    if (!close) {
      const el = { tag, attrs: attrs(rest), start: m.index, openEnd: m.index + m[0].length };
      out.push(el);
      if (VOID.has(tag) || rest.trim().endsWith('/')) { el.closeStart = el.end = el.openEnd; } else stack.push(el);
    } else {
      const i = stack.map((e) => e.tag).lastIndexOf(tag);
      if (i < 0) continue;
      const [el] = stack.splice(i); // drop unclosed children too (e.g. <p> closed implicitly)
      el.closeStart = m.index; el.end = m.index + m[0].length;
    }
  }
  for (const el of stack) { el.closeStart = el.end = html.length; el.unclosed = true; }
  return out;
}

// Strict: every "<" must start a complete allowlisted tag written as <tag> or <tag name="value" …>
// (lowercase, single spaces, double-quoted values only). Anything else is refused, never guessed at.
const TAG = /^<(\/?)([a-z][a-z0-9]*)((?: [a-z]+="[^"<>]*")*)\s*(\/?)\s*>/;
function checkRich(inner, id) {
  const errs = [];
  for (let i = inner.indexOf('<'); i >= 0; i = inner.indexOf('<', i + 1)) {
    const m = inner.slice(i).match(TAG);
    if (!m) { errs.push(`rich field "${id}" has a "<" that is not a simple allowed tag: ${JSON.stringify(inner.slice(i, i + 40))}`); continue; }
    const [, close, tag, rest] = m;
    if (!RICH_TAGS.has(tag)) { errs.push(`rich field "${id}" has <${tag}> (not allowed)`); continue; }
    if (close && rest) { errs.push(`rich field "${id}" has attributes on </${tag}>`); continue; }
    const seenAttr = new Set();
    for (const [, k, v] of rest.matchAll(/ ([a-z]+)="([^"]*)"/g)) {
      if (seenAttr.has(k)) errs.push(`rich field "${id}" repeats attribute ${k} on <${tag}>`);
      seenAttr.add(k);
      if (tag === 'a' && k === 'href') { if (!URL_OK.test(v)) errs.push(`rich field "${id}" has a link href "${v}" that is not allowed`); }
      else if (tag === 'p' && k === 'class' && v === 'note') { /* ok */ }
      else errs.push(`rich field "${id}" has attribute ${k} on <${tag}> (not allowed)`);
    }
  }
  return errs;
}

export function checkFile(html, file) {
  const errs = [], ids = new Map();
  const seen = (id, what) => {
    if (!ID.test(id)) errs.push(`${what} id "${id}" must match ${ID}`);
    else if (ids.has(id)) errs.push(`${what} id "${id}" used twice`);
    ids.set(id, what);
  };
  const els = elements(html);
  const fields = els.filter((e) => 'data-cms' in e.attrs);
  const locks = els.filter((e) => 'data-cms-lock' in e.attrs);
  for (const f of fields) {
    const id = f.attrs['data-cms'], type = f.attrs['data-cms-type'];
    seen(id, 'field');
    if (!TYPES.has(type)) { errs.push(`field "${id}" has type "${type}" (use text, rich, link or image)`); continue; }
    const inner = html.slice(f.openEnd, f.closeStart);
    if (type === 'text' && /<[a-zA-Z/]/.test(inner)) errs.push(`text field "${id}" contains tags`);
    if (type === 'rich') errs.push(...checkRich(inner, id));
    if (type === 'link') {
      if (f.tag !== 'a') errs.push(`link field "${id}" must be on <a>`);
      else if (/<[a-zA-Z/]/.test(inner)) errs.push(`link field "${id}" text contains tags`);
    }
    if (type === 'image') {
      if (f.tag !== 'img') errs.push(`image field "${id}" must be on <img>`);
      else if (!('alt' in f.attrs)) errs.push(`image field "${id}" needs alt`);
      else if (f.attrs.alt === '' && !('data-cms-decorative' in f.attrs)) errs.push(`image field "${id}" has empty alt without data-cms-decorative`);
      if (els.some((p) => p.tag === 'picture' && p.start < f.start && f.end <= p.end)) errs.push(`image field "${id}" is inside <picture> (not supported in v1)`);
    }
    for (const o of fields) if (o !== f && o.start < f.start && f.end <= o.end) errs.push(`field "${id}" is inside field "${o.attrs['data-cms']}"`);
    for (const l of locks) if (l.start <= f.start && f.end <= l.end) errs.push(`field "${id}" is inside a lock`);
  }
  // Areas and blocks.
  let area = null, block = null, last = 0;
  for (const m of html.matchAll(/<!-- (\/?)cms:(area|block)\b([^>]*?)-->/g)) {
    const [, close, kind, rest] = m, a = attrs(rest);
    if (!close) {
      if (kind === 'area') {
        if (area) errs.push(`areas do not nest (area "${a.id}" inside "${area}")`);
        seen(a.id, 'area'); area = a.id;
      } else {
        if (!area) errs.push(`block "${a.id}" is not inside an area`);
        if (block) errs.push(`blocks do not nest (block "${a.id}" inside "${block.id}")`);
        else if (area && html.slice(last, m.index).trim()) errs.push(`area "${area}" may hold only blocks (found other content before block "${a.id}")`);
        seen(a.id, 'block'); block = { id: a.id, start: m.index + m[0].length };
      }
      if (!a.label) errs.push(`${kind} "${a.id}" needs a label`);
    } else if (kind === 'block') {
      if (!block) errs.push('a /cms:block closes nothing');
      else {
        const body = html.slice(block.start, m.index);
        if (/<template data-cms-hidden>/.test(body) && !/^\s*<template data-cms-hidden>[\s\S]*<\/template>\s*$/.test(body)) errs.push(`hidden block "${block.id}" must be wrapped in exactly one <template data-cms-hidden>`);
      }
      block = null;
    } else {
      if (!area) errs.push('a /cms:area closes nothing');
      else if (block) errs.push(`block "${block.id}" is not closed before area "${area}" ends`);
      else if (html.slice(last, m.index).trim()) errs.push(`area "${area}" may hold only blocks (found other content at its end)`);
      area = null;
    }
    last = m.index + m[0].length;
  }
  if (block) errs.push(`block "${block.id}" is not closed`);
  if (area) errs.push(`area "${area}" is not closed`);
  return errs.map((e) => `${file}: ${e}`);
}

// Blog post bodies (contract §7): only the rich-text allowlist (tags, href on a, class="note" on p, safe URLs).
export const checkPost = (body, file) => checkRich(body, 'body').map((e) => `${file}: ${e.replace('rich field "body"', 'post body')}`);

// ---- Profile (mainframe.json) ----
const lum = (hex) => {
  const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export function checkProfile(root) {
  const errs = [], file = join(root, 'mainframe.json');
  if (!existsSync(file)) return ['mainframe.json is missing'];
  const p = JSON.parse(readFileSync(file, 'utf8'));
  const has = (path, what) => { if (!path || !existsSync(join(root, path))) errs.push(`mainframe.json: ${what} "${path}" does not exist`); };
  const glob = (pattern, what) => {
    const m = pattern.match(/^(.*)\/\*(\.[a-z]+)$/);
    if (!m) return has(pattern, what);
    if (!existsSync(join(root, m[1])) || !readdirSync(join(root, m[1])).some((f) => f.endsWith(m[2]))) errs.push(`mainframe.json: ${what} "${pattern}" matches nothing`);
  };
  if (p.contract !== 1) errs.push('mainframe.json: contract must be 1');
  for (const k of ['name', 'id', 'repo', 'branch', 'liveUrl', 'previewUrl']) if (!p[k]) errs.push(`mainframe.json: missing ${k}`);
  has(p.theme?.mark, 'theme.mark'); if (p.theme?.markDark) has(p.theme.markDark, 'theme.markDark');
  for (const mode of ['light', 'dark']) {
    const t = p.theme?.[mode] || {};
    for (const [fg, bg] of [['ink', 'page'], ['ink', 'panel'], ['muted', 'page'], ['sidebarInk', 'sidebar'], ['accentInk', 'accent'], ['danger', 'page']]) {
      if (!/^#[0-9a-fA-F]{6}$/.test(t[fg] || '') || !/^#[0-9a-fA-F]{6}$/.test(t[bg] || '')) { errs.push(`mainframe.json: theme.${mode}.${fg}/${bg} must be #RRGGBB colors`); continue; }
      const r = contrast(t[fg], t[bg]);
      if (r < 4.5) errs.push(`mainframe.json: theme.${mode} ${fg} on ${bg} is ${r.toFixed(2)}:1 (needs 4.5:1)`);
    }
  }
  glob(p.pages?.sources, 'pages.sources');
  for (const x of p.partials || []) has(x.file, 'partial');
  for (const x of p.templates || []) has(x.file, 'template');
  for (const c of p.collections || []) has(c.folder, `collection ${c.id} folder`);
  for (const l of p.lists || []) has(l.file, `list ${l.id} file`);
  if (p.media) has(p.media.folder, 'media.folder');
  if (p.settings?.redirects) has(p.settings.redirects, 'settings.redirects'); if (p.settings?.noindex) has(p.settings.noindex.file, 'settings.noindex.file');
  has(p.build?.ci && `.github/workflows/${p.build.ci}`, 'build.ci');
  for (const f of p.rules?.lockedFiles || []) has(f, 'rules.lockedFiles');
  return errs;
}

// ---- CLI ----
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const errs = [];
  let n = 0;
  for (const dir of ['site/pages', 'site/partials', 'site/templates']) {
    if (!existsSync(join(root, dir))) continue;
    for (const f of readdirSync(join(root, dir)).filter((x) => x.endsWith('.html'))) {
      errs.push(...checkFile(readFileSync(join(root, dir, f), 'utf8'), `${dir}/${f}`)); n++;
    }
  }
  if (existsSync(join(root, 'blog-src'))) for (const f of readdirSync(join(root, 'blog-src')).filter((x) => x.endsWith('.html'))) {
    const src = readFileSync(join(root, 'blog-src', f), 'utf8');
    errs.push(...checkPost(src.replace(/^\s*<!--[\s\S]*?-->/, ''), `blog-src/${f}`)); n++;
  }
  if (process.argv.includes('--profile')) errs.push(...checkProfile(root));
  if (errs.length) { console.log(errs.join('\n')); console.log(`${errs.length} problem(s).`); process.exit(1); }
  console.log(`Markers OK in ${n} file(s)${process.argv.includes('--profile') ? ', mainframe.json OK' : ''}.`);
}
