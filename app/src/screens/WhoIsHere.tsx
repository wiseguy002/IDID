import type { Member } from '../types';
import { roleLabel } from '../lib/util';

export default function WhoIsHere({ members, current, onPick }: { members: Member[]; current: string | null; onPick: (id: string) => void }) {
  return (
    <div className="lock">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ textAlign: 'center' }}>Who's here right now?</h1>
        <p className="muted" style={{ textAlign: 'center' }}>This helps keep notes with the right person.</p>
        <div className="stack" style={{ marginTop: '1.2rem' }}>
          {members.map((m) => (
            <button key={m.id} className="card row" style={{ width: '100%', cursor: 'pointer', textAlign: 'left', borderColor: m.id === current ? 'var(--accent)' : undefined }} onClick={() => onPick(m.id)}>
              <span className="brand-mark" style={{ background: m.color, color: '#fff', fontWeight: 700, width: 40, height: 40 }}>{m.name.charAt(0)}</span>
              <span><b>{m.name}</b><br /><span className="muted small">{roleLabel(m)}</span></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
