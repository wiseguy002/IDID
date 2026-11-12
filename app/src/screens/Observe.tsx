import { useState } from 'react';
import { store } from '../db';
import { useApp } from '../state';
import { OBSERVED_SIGNS, usLabel } from '../lib/defaults';
import { fmtDateTime, partWords } from '../lib/util';
import { DURATIONS, type Entry, type Observation } from '../types';
import { ChipSelect, PageHead, Segmented } from '../components/ui';

export default function Observe({ id }: { id: string }) {
  const { members, parts, settings, go, toast } = useApp();
  const [o, setO] = useState<Observation | null>(() => { const x = store.get('observations', id); return x ? { ...x, noticed: x.noticed.map(usLabel) } : null; });
  const e: Entry | undefined = o ? store.get('entries', o.entryId) : undefined;
  const w = partWords(settings.partWord);
  if (!o || !e) return null;

  const subj = members.find((m) => m.id === e.subjectId);
  const subjParts = parts.filter((p) => p.memberId === e.subjectId && !p.archived);
  const set = <K extends keyof Observation>(k: K, v: Observation[K]) => setO({ ...o, [k]: v });

  const save = async () => {
    await store.put('observations', { ...o, status: 'done', respondedAt: Date.now() });
    toast('Thank you. Your note helps build a clearer picture.');
    go({ name: 'entry', id: e.id });
  };

  return (
    <div className="fade-in stack">
      <PageHead title="What did you notice?" sub={`About ${subj?.name ?? 'someone'} · ${fmtDateTime(e.occurredAt)}${e.location ? ` · ${e.location}` : ''}`} onBack={() => go({ name: 'home' })} />
      <div className="card warm small">Share only what you saw or heard, without judgment. There are no wrong answers, and you can skip anything.</div>
      <div>
        <div className="eyebrow">Were you there?</div>
        <Segmented label="Present" value={o.present == null ? '' : o.present ? 'y' : 'n'} onChange={(v) => set('present', v === 'y')}
          options={[{ value: 'y', label: 'I was there' }, { value: 'n', label: 'I noticed after' }]} />
      </div>
      <div>
        <div className="eyebrow">Things you noticed</div>
        <ChipSelect value={o.noticed} onChange={(v) => set('noticed', v)} options={OBSERVED_SIGNS.map((s) => ({ value: s, label: s }))} onAdd={(v) => set('noticed', [...o.noticed, v])} />
      </div>
      {subjParts.length > 0 && (
        <div>
          <div className="eyebrow">Did it seem like a particular {w.one}?</div>
          <ChipSelect value={o.partIds} onChange={(v) => set('partIds', v)} options={subjParts.map((p) => ({ value: p.id, label: p.name, color: p.color }))} />
        </div>
      )}
      <div>
        <div className="eyebrow">How long did it seem to last?</div>
        <ChipSelect multi={false} value={o.duration ? [o.duration] : []} onChange={(v) => set('duration', (v[0] as Observation['duration']) ?? null)} options={DURATIONS} />
      </div>
      <label className="field"><span>In your own words</span>
        <textarea className="input" value={o.text} onChange={(ev) => set('text', ev.target.value)} placeholder="What happened before, during, or after? What helped?" /></label>
      <div className="row">
        <button className="btn primary" onClick={save}>Share my note</button>
        <button className="btn ghost" onClick={() => go({ name: 'home' })}>Later</button>
      </div>
    </div>
  );
}
