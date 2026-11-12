import type { Resource } from '../lib/resources';
import { smsHref, telHref } from '../lib/resources';
import { Icon } from './Icon';

export function ResourceCard({ r, zip, onCopy, compact }: { r: Resource; zip?: string; onCopy?: (z: string) => void; compact?: boolean }) {
  const href = zip && r.zipUrl ? r.zipUrl(zip) : r.url;
  const host = new URL(href).hostname.replace(/^www\./, '');
  return (
    <div className="card" style={compact ? { padding: '.85rem .95rem', marginBottom: '.6rem' } : undefined}>
      <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0 }}>{r.name}</h3>
        {r.hours && r.hours.length <= 12 && <span className="tag" style={{ whiteSpace: 'nowrap' }}>{r.hours}</span>}
      </div>
      {!compact && <p className="small muted" style={{ margin: '.3rem 0 .6rem' }}>{r.about}</p>}
      {r.hours && r.hours.length > 12 && !compact && <p className="tiny muted" style={{ marginTop: '-.3rem' }}>{r.hours}</p>}
      <div className="row" style={{ gap: '.45rem', marginTop: compact ? '.5rem' : 0 }}>
        {r.call && <a className="btn sm primary" href={telHref(r.call)}><Icon name="bell" size={15} /> Call {r.callLabel}</a>}
        {r.text && <a className="btn sm" href={smsHref(r.text)}>{r.text.label}</a>}
        <a className="btn sm" href={href} target="_blank" rel="noopener noreferrer"><Icon name="share" size={15} /> {r.zipUrl && zip ? `Open results for ${zip}` : r.kind === 'talk' && r.id === '988' ? 'Chat online' : `Open ${host}`}</a>
        {r.asksForZip && zip && onCopy && <button className="btn sm ghost" onClick={() => onCopy(zip)}>Copy ZIP {zip}</button>}
      </div>
      {r.asksForZip && zip && !compact && <p className="tiny muted" style={{ margin: '.5rem 0 0' }}>Enter {zip} on the site to see what's near you.</p>}
    </div>
  );
}
