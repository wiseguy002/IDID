import { useEffect, useRef, useState } from 'react';
import { store, uid, useAll } from '../db';
import { useApp } from '../state';
import { fmtDateTime, partWords } from '../lib/util';
import { blobToBase64, base64ToBlob, MAX_VOICE_MS, pickMime, voiceSupported } from '../lib/voice';
import type { VoiceNote } from '../types';
import { ChipSelect, Empty, PageHead } from '../components/ui';
import { Icon } from '../components/Icon';

/** Short voice notes, encrypted like everything else. For when writing is too much. */
export default function VoiceNotes() {
  const { me, members, parts, settings, go, toast } = useApp();
  const w = partWords(settings.partWord);
  const owner = me?.tracked ? me : members.find((m) => m.tracked) ?? me;
  const ps = parts.filter((p) => p.memberId === owner?.id && !p.archived);
  const notes = useAll('voice').filter((v) => v.memberId === owner?.id).sort((a, b) => b.createdAt - a.createdAt);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [title, setTitle] = useState('');
  const [partId, setPartId] = useState<string[]>([]);
  const [problem, setProblem] = useState('');
  const started = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => { window.clearInterval(timer.current); rec?.stream.getTracks().forEach((t) => t.stop()); }, [rec]);

  if (!owner) return null;

  const start = async () => {
    setProblem('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = pickMime();
      const r = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = async () => {
        window.clearInterval(timer.current);
        stream.getTracks().forEach((t) => t.stop());
        const durationMs = Math.min(Date.now() - started.current, MAX_VOICE_MS);
        const blob = new Blob(chunks, { type: r.mimeType || mime || 'audio/webm' });
        setRec(null); setElapsed(0);
        if (durationMs < 800 || !blob.size) { toast('That was too short to keep.'); return; }
        const v: VoiceNote = { id: uid(), memberId: owner.id, partId: partId[0] ?? null, title: title.trim(), mime: blob.type, audio: await blobToBase64(blob), durationMs, createdAt: Date.now() };
        await store.put('voice', v);
        setTitle(''); setPartId([]);
        toast('Saved and encrypted. Only your own devices can play it.');
      };
      started.current = Date.now();
      r.start(1000);
      setRec(r);
      timer.current = window.setInterval(() => {
        const ms = Date.now() - started.current;
        setElapsed(ms);
        if (ms >= MAX_VOICE_MS && r.state === 'recording') r.stop();
      }, 250);
    } catch (e) {
      setProblem((e as Error).name === 'NotAllowedError'
        ? 'iDID needs permission to use the microphone. You can allow it in your browser’s site settings, then try again.'
        : 'Recording didn’t start on this device. You can still write a note instead.');
    }
  };
  const stop = () => { if (rec?.state === 'recording') rec.stop(); };
  const secs = Math.floor(elapsed / 1000);
  const left = Math.max(0, Math.ceil((MAX_VOICE_MS - elapsed) / 1000));

  return (
    <div className="fade-in">
      <PageHead title="Voice notes" sub="Say it instead of typing it. Encrypted, and private to your own devices." onBack={() => go({ name: 'home' })} />
      {!voiceSupported() ? (
        <Empty title="Recording isn't available here">This browser can't record audio. Try a recent version of Chrome, Safari, Edge or Firefox.</Empty>
      ) : (
        <div className="card">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="A title (optional)" aria-label="Title (optional)" disabled={!!rec} />
          {ps.length > 0 && <>
            <div className="eyebrow" style={{ marginTop: '.7rem' }}>Who's speaking (optional)</div>
            <ChipSelect multi={false} value={partId} onChange={setPartId} options={ps.map((p) => ({ value: p.id, label: p.name, color: p.color }))} />
          </>}
          {rec ? (
            <div className="row" style={{ marginTop: '.7rem', alignItems: 'center' }}>
              <span className="rec-dot" aria-hidden="true" />
              <span aria-live="polite"><b>Recording</b> {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')} <span className="muted small">({left}s left)</span></span>
              <button className="btn primary" onClick={stop}>Stop and save</button>
            </div>
          ) : (
            <button className="btn primary" style={{ marginTop: '.7rem' }} onClick={start}><Icon name="mic" size={16} /> Record</button>
          )}
          {problem && <p className="small" role="alert">{problem}</p>}
          <p className="tiny muted" style={{ margin: '.6rem 0 0' }}>Up to 2 minutes each. Recordings are encrypted on this device before they're stored or synced, and are never shared with your circle.</p>
        </div>
      )}

      {notes.length === 0 ? <Empty title="No voice notes yet">{`Record a thought, a reminder for another ${w.one}, or what happened, in your own voice.`}</Empty>
        : notes.map((v) => <VoiceRow key={v.id} v={v} who={v.partId ? ps.find((p) => p.id === v.partId)?.name : undefined} />)}
    </div>
  );
}

function VoiceRow({ v, who }: { v: VoiceNote; who?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(base64ToBlob(v.audio, v.mime));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [v.audio, v.mime]);
  const s = Math.round(v.durationMs / 1000);
  return (
    <div className="card">
      <div className="row between small"><b>{v.title || 'Voice note'}</b><span className="muted">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span></div>
      <p className="tiny muted" style={{ margin: '.2rem 0 .5rem' }}>{fmtDateTime(v.createdAt)}{who ? ` · ${who}` : ''}</p>
      {url && <audio controls preload="none" src={url} style={{ width: '100%' }} />}
      <button className="btn ghost sm danger" style={{ marginTop: '.4rem' }} onClick={() => { if (confirm('Delete this voice note? This can’t be undone.')) store.remove('voice', v.id); }}>Delete</button>
    </div>
  );
}
