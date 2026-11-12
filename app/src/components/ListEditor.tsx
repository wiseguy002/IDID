import { useState } from 'react';
import { Icon } from './Icon';

/** Edit a short list of phrases, with optional suggestion chips to add in one tap. */
export function ListEditor({ id, items, onChange, suggestions = [], placeholder }: {
  id: string; items: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string;
}) {
  const [text, setText] = useState('');
  const add = (t: string) => { const v = t.trim(); if (v && !items.includes(v)) onChange([...items, v]); };
  const unused = suggestions.filter((s) => !items.includes(s));
  return (
    <div>
      {items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 .6rem', display: 'grid', gap: '.4rem' }}>
          {items.map((it, i) => (
            <li key={it} className="row between" style={{ flexWrap: 'nowrap', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '.45rem .6rem .45rem .8rem' }}>
              <span style={{ minWidth: 0 }}>{it}</span>
              <span className="row" style={{ gap: 0, flexWrap: 'nowrap', flexShrink: 0 }}>
                {i > 0 && <button className="iconbtn" style={{ width: 36, height: 36 }} aria-label={`Move "${it}" up`} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}><Icon name="back" size={16} /></button>}
                <button className="iconbtn" style={{ width: 36, height: 36 }} aria-label={`Remove "${it}"`} onClick={() => onChange(items.filter((x) => x !== it))}><Icon name="close" size={16} /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); add(text); setText(''); }}>
        <input id={id} className="input" style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder ?? 'Add your own'} />
        <button className="btn sm" type="submit" disabled={!text.trim()}>Add</button>
      </form>
      {unused.length > 0 && (
        <div className="chips" style={{ marginTop: '.5rem' }}>
          {unused.map((s) => <button key={s} type="button" className="chip add" onClick={() => add(s)}><Icon name="plus" size={14} /> {s}</button>)}
        </div>
      )}
    </div>
  );
}
