import { useMemo, useRef, useState } from 'react';
import { store, uid, useAll } from '../db';
import { useApp } from '../state';
import { partWords } from '../lib/util';
import type { ComfortItem, ComfortType } from '../types';
import { ChipSelect, Empty, PageHead, Sheet } from '../components/ui';
import { Icon } from '../components/Icon';

const TYPES: { value: ComfortType; label: string; icon: string; hint: string }[] = [
  { value: 'photo', label: 'Photo', icon: 'sun', hint: 'A place, a pet, a person, a memory that feels safe' },
  { value: 'song', label: 'Song', icon: 'sparkle', hint: 'Paste a link from your music app, or just the name' },
  { value: 'quote', label: 'Words', icon: 'note', hint: 'A quote, a mantra, a line from a book' },
  { value: 'letter', label: 'Letter', icon: 'heart', hint: 'A note from a part who feels safe, for hard moments' },
  { value: 'scent', label: 'Scent or texture', icon: 'leaf', hint: 'Lavender, a soft sweater, a smooth stone' },
  { value: 'activity', label: 'Activity', icon: 'body', hint: 'Something soothing to do' },
  { value: 'place', label: 'Place', icon: 'flower', hint: 'Somewhere real or imagined that feels calm' },
  { value: 'person', label: 'Person', icon: 'people', hint: 'Someone whose voice or presence helps' },
];
const typeOf = (t: ComfortType) => TYPES.find((x) => x.value === t)!;

/** Shrink a photo on the device so it stays small once encrypted (max ~900px, JPEG). */
export async function resizeImage(file: File, max = 900): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  let q = 0.82, url = c.toDataURL('image/jpeg', q);
  while (url.length > 350_000 && q > 0.4) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
  return url;
}

function ItemForm({ it, onClose }: { it: ComfortItem; onClose: () => void }) {
  const { parts, settings, toast } = useApp();
  const w = partWords(settings.partWord);
  const [x, setX] = useState(it);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !store.get('comfort', it.id);
  const t = typeOf(x.type);
  const ps = parts.filter((p) => p.memberId === it.memberId && !p.archived);
  const pick = async (f?: File) => { if (!f) return; try { setX({ ...x, image: await resizeImage(f), title: x.title || f.name.replace(/\.[^.]+$/, '') }); } catch { toast("That photo couldn't be opened."); } };
  return (
    <Sheet title={isNew ? 'Add to my comfort kit' : x.title || t.label} onClose={onClose}>
      <ChipSelect multi={false} value={[x.type]} onChange={(v) => v[0] && setX({ ...x, type: v[0] as ComfortType })} options={TYPES.map((y) => ({ value: y.value, label: y.label }))} />
      <p className="small muted">{t.hint}</p>
      {x.type === 'photo' && (
        <div style={{ marginBottom: '.8rem' }}>
          {x.image && <img src={x.image} alt="" style={{ maxHeight: 220, borderRadius: 14, display: 'block', marginBottom: '.5rem' }} />}
          <button className="btn sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> {x.image ? 'Choose a different photo' : 'Choose a photo'}</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      )}
      <label className="field"><span>{x.type === 'letter' ? 'Title' : 'Name'}</span><input id="cf-title" className="input" value={x.title} onChange={(e) => setX({ ...x, title: e.target.value })} placeholder={x.type === 'letter' ? 'For when it feels scary' : ''} /></label>
      {x.type === 'letter' && ps.length > 0 && (
        <><div className="eyebrow">Written by</div><ChipSelect multi={false} value={x.fromPartId ? [x.fromPartId] : []} onChange={(v) => setX({ ...x, fromPartId: v[0] ?? null })} options={ps.map((p) => ({ value: p.id, label: p.name, color: p.color }))} />
          <p className="tiny muted">Any {w.one} who feels safe can write to the others.</p></>
      )}
      {x.type !== 'photo' && <label className="field"><span>{x.type === 'letter' ? 'The letter' : 'Words or details'}</span><textarea id="cf-text" className="input" style={{ minHeight: x.type === 'letter' ? 180 : 90 }} value={x.text} onChange={(e) => setX({ ...x, text: e.target.value })} /></label>}
      {(x.type === 'song' || x.type === 'place' || x.type === 'activity') && <label className="field"><span>Link <span className="muted small">(optional)</span></span><input id="cf-url" className="input" type="url" value={x.url} onChange={(e) => setX({ ...x, url: e.target.value })} placeholder="https://" /></label>}
      <div className="row">
        <button className="btn primary" disabled={!(x.title.trim() || x.text.trim() || x.image)} onClick={async () => { const u = x.url.trim(); await store.put('comfort', { ...x, url: u && !/^https?:\/\//i.test(u) ? `https://${u}` : u }); toast('Added to your comfort kit.'); onClose(); }}>Save</button>
        {!isNew && <button className="btn ghost danger" onClick={async () => { await store.remove('comfort', it.id); onClose(); }}>Remove</button>}
      </div>
    </Sheet>
  );
}

function ItemView({ it, onEdit, onClose }: { it: ComfortItem; onEdit: () => void; onClose: () => void }) {
  const { parts } = useApp();
  const from = parts.find((p) => p.id === it.fromPartId);
  return (
    <Sheet title={it.title || typeOf(it.type).label} onClose={onClose}>
      {it.image && <img src={it.image} alt={it.title || 'A comforting photo'} style={{ width: '100%', borderRadius: 18, marginBottom: '.8rem' }} />}
      {it.text && <p style={{ whiteSpace: 'pre-wrap', fontSize: it.type === 'quote' ? '1.3rem' : '1.08rem', lineHeight: 1.6 }}>{it.text}</p>}
      {from && <p className="small muted">— {from.name}</p>}
      <div className="row">
        {it.url && <a className="btn primary" href={it.url} target="_blank" rel="noopener noreferrer"><Icon name="share" size={16} /> Open</a>}
        <button className="btn ghost" onClick={onEdit}><Icon name="edit" size={16} /> Edit</button>
      </div>
    </Sheet>
  );
}

export default function Comfort() {
  const { me, members, go, settings } = useApp();
  const w = partWords(settings.partWord);
  const tracked = members.filter((m) => m.tracked);
  const whoId = me?.tracked ? me.id : tracked[0]?.id ?? me?.id ?? '';
  const items = useAll('comfort').filter((c) => c.memberId === whoId).sort((a, b) => b.createdAt - a.createdAt);
  const [edit, setEdit] = useState<ComfortItem | null>(null);
  const [view, setView] = useState<ComfortItem | null>(null);
  const [filter, setFilter] = useState<string[]>([]);
  const shown = useMemo(() => items.filter((i) => !filter.length || filter.includes(i.type)), [items, filter]);
  const blank = (type: ComfortType = 'photo'): ComfortItem => ({ id: uid(), memberId: whoId, type, title: '', text: '', url: '', image: '', fromPartId: null, createdAt: Date.now() });

  return (
    <div className="fade-in">
      <PageHead title="Comfort kit" sub="Things that help you feel safe and soothed, ready for hard moments." onBack={() => go({ name: 'pause' })}
        right={<button className="btn sm primary" onClick={() => setEdit(blank())}><Icon name="plus" size={16} /> Add</button>} />
      {items.length > 0 && <button className="btn block" style={{ marginBottom: '.8rem' }} onClick={() => setView(items[Math.floor(Math.random() * items.length)])}><Icon name="sparkle" size={17} /> Show me something comforting</button>}
      {items.length === 0 ? (
        <Empty title="Start your comfort kit">Add a photo, a song, a few kind words, or a letter from a {w.one} who feels safe. Everything is private and encrypted.
          <div className="chips" style={{ justifyContent: 'center', marginTop: '.8rem' }}>{TYPES.slice(0, 4).map((t) => <button key={t.value} className="chip add" onClick={() => setEdit(blank(t.value))}><Icon name="plus" size={14} /> {t.label}</button>)}</div>
        </Empty>
      ) : (
        <>
          <ChipSelect value={filter} onChange={setFilter} options={TYPES.filter((t) => items.some((i) => i.type === t.value)).map((t) => ({ value: t.value, label: t.label }))} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '.7rem', marginTop: '.8rem' }}>
            {shown.map((i) => (
              <button key={i.id} className="card" style={{ margin: 0, padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', minHeight: 130 }} onClick={() => setView(i)}>
                {i.image ? <img src={i.image} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} /> : (
                  <div style={{ height: 70, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name={typeOf(i.type).icon} size={28} /></div>
                )}
                <div style={{ padding: '.6rem .7rem' }}><b className="small">{i.title || typeOf(i.type).label}</b>{!i.image && i.text && <div className="tiny muted" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{i.text}</div>}</div>
              </button>
            ))}
          </div>
        </>
      )}
      {edit && <ItemForm it={edit} onClose={() => setEdit(null)} />}
      {view && <ItemView it={view} onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }} />}
    </div>
  );
}
