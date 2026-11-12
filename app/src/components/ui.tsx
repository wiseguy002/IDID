import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export function Chip({ on, onClick, children, color }: { on?: boolean; onClick: () => void; children: ReactNode; color?: string }) {
  return (
    <button type="button" className="chip" aria-pressed={!!on} onClick={onClick}>
      {color && <span className="dot" style={{ background: color }} />}
      {children}
      {on && <Icon name="check" size={15} />}
    </button>
  );
}

/** Multi- or single-select chip list with an optional "add your own". */
export function ChipSelect({ options, value, onChange, multi = true, onAdd, addLabel = 'Add your own' }: {
  options: { value: string; label: string; color?: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  multi?: boolean;
  onAdd?: (label: string) => void;
  addLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const toggle = (v: string) => {
    if (multi) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    else onChange(value.includes(v) ? [] : [v]);
  };
  const submit = () => {
    const t = text.trim();
    if (t && onAdd) onAdd(t);
    setText('');
    setAdding(false);
  };
  return (
    <div className="chips">
      {options.map((o) => (
        <Chip key={o.value} on={value.includes(o.value)} onClick={() => toggle(o.value)} color={o.color}>{o.label}</Chip>
      ))}
      {onAdd && !adding && (
        <button type="button" className="chip add" onClick={() => setAdding(true)}><Icon name="plus" size={15} /> {addLabel}</button>
      )}
      {onAdd && adding && (
        <form className="row" style={{ width: '100%' }} onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input autoFocus className="input" style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type and press add" />
          <button className="btn sm primary" type="submit">Add</button>
          <button className="btn sm ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      )}
    </div>
  );
}

export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <span><span style={{ fontWeight: 600 }}>{label}</span>{hint && <span className="muted small" style={{ display: 'block' }}>{hint}</span>}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: '.6rem' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function PageHead({ title, sub, onBack, right }: { title: string; sub?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start', marginBottom: '.8rem', flexWrap: 'nowrap' }}>
      {onBack && <button className="iconbtn" onClick={onBack} aria-label="Back" style={{ marginLeft: '-.6rem' }}><Icon name="back" /></button>}
      <div style={{ flex: 1 }}>
        <h1 style={{ marginBottom: sub ? '.15rem' : 0 }}>{title}</h1>
        {sub && <p className="muted" style={{ margin: 0 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card soft" style={{ textAlign: 'center', padding: '2rem 1.2rem' }}>
      <div style={{ color: 'var(--accent)', marginBottom: '.4rem' }}><Icon name="leaf" size={30} /></div>
      <h3>{title}</h3>
      {children && <div className="muted small">{children}</div>}
    </div>
  );
}
