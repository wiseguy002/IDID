/**
 * Parses CHANGELOG.md (Keep a Changelog format) into versions the app can show.
 * The changelog file is the single source of truth; this only reads it.
 */
export interface Release {
  version: string;           // "0.6.0" or "Unreleased"
  date: string | null;       // "2026-11-12"
  summary: string;           // first paragraph under the heading
  sections: { title: string; items: string[] }[];
}

const HEADING = /^## \[([^\]]+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?\s*$/;

export function parseChangelog(md: string): Release[] {
  const out: Release[] = [];
  let cur: Release | null = null;
  let sec: Release['sections'][number] | null = null;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const h = line.match(HEADING);
    if (h) {
      cur = { version: h[1], date: h[2] ?? null, summary: '', sections: [] };
      sec = null;
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    if (/^\[[^\]]+\]:\s/.test(line)) continue; // link reference definitions
    if (line.startsWith('### ')) { sec = { title: line.slice(4).trim(), items: [] }; cur.sections.push(sec); continue; }
    if (/^[-*] /.test(line) && sec) { sec.items.push(line.slice(2).trim()); continue; }
    if (/^\s{2,}\S/.test(raw) && sec?.items.length) { sec.items[sec.items.length - 1] += ' ' + line.trim(); continue; }
    if (line && !sec && !cur.summary) cur.summary = line.trim();
  }
  return out;
}

export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Released versions newer than `since` (exclusive) up to and including `upTo`. */
export function releasesBetween(all: Release[], since: string | null, upTo: string): Release[] {
  return all.filter((r) => SEMVER.test(r.version) && compareVersions(r.version, upTo) <= 0 && (!since || compareVersions(r.version, since) > 0));
}

/** Renders **bold** inside an item as segments, so the UI can show it without HTML. */
export function boldSegments(s: string): { text: string; bold: boolean }[] {
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => (p.startsWith('**') ? { text: p.slice(2, -2), bold: true } : { text: p, bold: false }));
}
