import { useMemo, useRef, useState } from 'react';
import { exportAll, importAll, useAll, type Backup } from '../db';
import { canSee, useApp } from '../state';
import { computeStats } from '../lib/stats';
import { download, durationLabel, entriesToCsv, fmtDateTime, moodLabel, partWords } from '../lib/util';
import { ChipSelect, PageHead, Segmented, Sheet } from '../components/ui';
import { Icon } from '../components/Icon';
import { Bars } from './Insights';

export default function Share() {
  const { me, members, parts, settings, go, toast } = useApp();
  const [range, setRange] = useState<'30' | '90' | 'all'>('90');
  const tracked = members.filter((m) => m.tracked);
  const [who, setWho] = useState<string[]>(me?.tracked ? [me.id] : tracked[0] ? [tracked[0].id] : []);
  const [importFile, setImportFile] = useState<Backup | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rawEntries = useAll('entries');
  const all = useMemo(() => [...rawEntries].sort((a, b) => a.occurredAt - b.occurredAt), [rawEntries]);
  const obs = useAll('observations').filter((o) => o.status === 'done');
  const w = partWords(settings.partWord);
  const mName = (id: string) => members.find((m) => m.id === id)?.name ?? '';
  const pName = (id: string) => parts.find((p) => p.id === id)?.name ?? '';

  const entries = useMemo(() => all.filter((e) => canSee(me, e) && (!who.length || who.includes(e.subjectId)) &&
    (range === 'all' || e.occurredAt > Date.now() - Number(range) * 86400000)), [all, me, who, range]);
  const s = useMemo(() => computeStats(entries, parts, mName), [entries, parts]); // eslint-disable-line
  const stamp = new Date().toISOString().slice(0, 10);
  const rangeLabel = range === 'all' ? 'All time' : `Last ${range} days`;

  const csv = () => entriesToCsv(entries, members, parts);
  const shareCsv = async () => {
    const file = new File([csv()], `idid-entries-${stamp}.csv`, { type: 'text/csv' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'IDID entries' }); } catch { /* cancelled */ }
    } else { download(file.name, file); toast('Downloaded — you can attach it to an email or message.'); }
  };

  const onPick = async (f: File | undefined) => {
    if (!f) return;
    try {
      const b = JSON.parse(await f.text()) as Backup;
      if (!b.entries) throw new Error();
      if (b.app !== 'idid') throw new Error();
      setImportFile(b);
    } catch { toast("That file doesn't look like an IDID backup."); }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="fade-in">
      <div className="no-print">
        <PageHead title="Share & export" sub="You choose what leaves this device." onBack={() => go({ name: 'insights' })} />
        <div className="card">
          <div className="eyebrow">What to include</div>
          <Segmented label="Range" value={range} onChange={setRange} options={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All time' }]} />
          {tracked.length > 1 && <div style={{ marginTop: '.6rem' }}><ChipSelect value={who} onChange={setWho} options={tracked.map((m) => ({ value: m.id, label: m.name, color: m.color }))} /></div>}
          <p className="small muted" style={{ margin: '.6rem 0 0' }}>{entries.length} entries selected. Private entries are only included when they're yours.</p>
        </div>
        <div className="stack">
          <button className="btn block primary" onClick={() => window.print()} disabled={!entries.length}><Icon name="print" size={18} /> Clinician summary (print or save as PDF)</button>
          <button className="btn block" onClick={shareCsv} disabled={!entries.length}><Icon name="share" size={18} /> Share spreadsheet (CSV)</button>
          <button className="btn block" onClick={() => download(`idid-entries-${stamp}.csv`, csv(), 'text/csv')} disabled={!entries.length}><Icon name="download" size={18} /> Download spreadsheet (CSV)</button>
        </div>
        <hr className="hr" />
        <h2>Backup</h2>
        <p className="small muted">A full backup includes every person, {w.one}, entry and note. Keep it somewhere safe — it isn't encrypted.</p>
        <div className="stack">
          <button className="btn block" onClick={async () => download(`idid-backup-${stamp}.json`, JSON.stringify(exportAll(), null, 2), 'application/json')}><Icon name="download" size={18} /> Download full backup</button>
          <button className="btn block" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> Restore or merge a backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onPick(e.target.files?.[0])} />
        </div>
        <h3 style={{ marginTop: '1.2rem' }}>Preview</h3>
      </div>

      {/* Printable report (also shown as preview) */}
      <article className="card" style={{ background: 'var(--surface)' }}>
        <div className="row between"><h2 style={{ margin: 0 }}>IDID summary{who.length === 1 ? ` — ${mName(who[0])}` : ''}</h2><span className="small muted">{rangeLabel}</span></div>
        <p className="small muted">Prepared {new Date().toLocaleDateString()} · self-reported journal entries and observations from a trust circle. Not a clinical assessment.</p>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', margin: '.8rem 0' }}>
          <div className="stat"><span className="tiny muted">Entries</span><b>{s.total}</b></div>
          <div className="stat"><span className="tiny muted">Usual mood</span><b style={{ fontSize: '1rem' }}>{s.avgMood ? moodLabel(Math.round(s.avgMood)) : '—'}</b></div>
          <div className="stat"><span className="tiny muted">Lost time</span><b>{s.lostTimePct}%</b></div>
          <div className="stat"><span className="tiny muted">Co-fronting</span><b>{s.coFrontPct}%</b></div>
        </div>
        <div className="grid2">
          <div><h3>Triggers</h3><Bars data={s.triggers} max={5} /></div>
          <div><h3>Fronting</h3><Bars data={s.fronting} max={5} color="var(--accent-2)" /></div>
          <div><h3>Locations</h3><Bars data={s.locations} max={5} color="var(--warm)" /></div>
          <div><h3>Feelings</h3><Bars data={s.feelings} max={5} color="var(--accent-2)" /></div>
        </div>
        <h3 style={{ marginTop: '1rem' }}>Entries</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '.3rem' }}>When</th><th>Where</th><th>Triggers</th><th>Mood</th><th>{w.One}(s)</th><th>Duration</th><th>Notes</th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                  <td style={{ padding: '.35rem .3rem', whiteSpace: 'nowrap' }}>{e.timeApprox ? '~' : ''}{fmtDateTime(e.occurredAt)}</td>
                  <td>{e.location}</td>
                  <td>{e.triggers.join(', ')}</td>
                  <td>{e.mood ? moodLabel(e.mood) : ''}{e.lostTime ? ' · lost time' : ''}</td>
                  <td>{[...e.frontingPartIds.map(pName), e.frontingUnknown ? 'unknown' : ''].filter(Boolean).join(', ')}{e.coFronting ? ` (co-front${e.coFrontPartIds.length ? ': ' + e.coFrontPartIds.map(pName).join(', ') : ''})` : ''}</td>
                  <td>{e.duration ? durationLabel(e.duration) : ''}</td>
                  <td>{[e.possibleCause, e.notes, ...obs.filter((o) => o.entryId === e.id).map((o) => `${mName(o.memberId)} noticed: ${[...o.noticed, o.text].filter(Boolean).join('; ')}`)].filter(Boolean).join(' — ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {importFile && (
        <Sheet title="Restore backup" onClose={() => setImportFile(null)}>
          <p>This backup has {importFile.entries?.length ?? 0} entries, {importFile.members?.length ?? 0} people and {importFile.parts?.length ?? 0} {w.many}, from {new Date(importFile.exportedAt).toLocaleString()}.</p>
          <div className="stack">
            <button className="btn block primary" onClick={async () => { await importAll(importFile, 'merge'); setImportFile(null); toast('Backup merged.'); }}>Merge with what's here</button>
            <button className="btn block" onClick={async () => { await importAll(importFile, 'replace'); setImportFile(null); toast('Backup restored.'); }}>Replace everything here</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
