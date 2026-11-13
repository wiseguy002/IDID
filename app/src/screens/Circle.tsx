import { useState } from 'react';
import { store, uid, useAll } from '../db';
import { useApp } from '../state';
import { PALETTE } from '../lib/defaults';
import { partWords, roleLabel } from '../lib/util';
import { ROLE_LABELS, type Member, type MemberRole, type Part } from '../types';
import { PageHead, Sheet, Switch } from '../components/ui';
import { Icon } from '../components/Icon';
import { AccessPanel, InvitationsCard, InviteSheet, personStatus, useRoster } from '../components/Invites';

function MemberForm({ m, onClose, roster }: { m: Member; onClose: () => void; roster: ReturnType<typeof useRoster> }) {
  const { members, toast } = useApp();
  const [x, setX] = useState(m);
  const isNew = !members.some((y) => y.id === m.id);
  const save = async () => {
    if (!x.name.trim()) return;
    await store.put('members', { ...x, name: x.name.trim() });
    toast(isNew ? `${x.name} joined your circle.` : 'Saved.');
    onClose();
  };
  const remove = async () => {
    for (const o of store.all('observations').filter((o) => o.memberId === m.id)) await store.remove('observations', o.id);
    await store.remove('members', m.id);
    toast(`${m.name} was removed from the circle.`);
    onClose();
  };
  return (
    <Sheet title={isNew ? 'Add to your circle' : `Edit ${m.name}`} onClose={onClose}>
      <label className="field"><span>Name</span><input className="input" value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} autoFocus /></label>
      <label className="field"><span>Relationship</span>
        <select className="input" value={x.role} onChange={(e) => setX({ ...x, role: e.target.value as MemberRole })}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
      <div className="eyebrow">Color</div>
      <div className="chips" style={{ marginBottom: '.6rem' }}>
        {PALETTE.map((c) => <button key={c} type="button" className="chip" aria-label={`Color ${c}`} aria-pressed={x.color === c} onClick={() => setX({ ...x, color: c })}><span className="dot" style={{ background: c, width: 18, height: 18 }} /></button>)}
      </div>
      <Switch label="Track their experiences" hint="Moments can be logged about this person, and they can have parts." checked={x.tracked} onChange={(v) => setX({ ...x, tracked: v })} />
      <Switch label="Can see shared entries" hint="Reads entries shared with the trust circle." checked={x.canView} onChange={(v) => setX({ ...x, canView: v })} />
      <Switch label="Can be asked what they noticed" checked={x.canObserve} onChange={(v) => setX({ ...x, canObserve: v })} />
      {!isNew && <><hr className="hr" /><AccessPanel member={m} roster={roster} /><hr className="hr" /></>}
      <div className="row" style={{ marginTop: '.8rem' }}>
        <button className="btn primary" onClick={save} disabled={!x.name.trim()}>Save</button>
        {!isNew && members.length > 1 && <button className="btn ghost danger" onClick={remove}>Remove from circle</button>}
      </div>
    </Sheet>
  );
}

function PartForm({ p, onClose }: { p: Part; onClose: () => void }) {
  const { parts, settings, toast } = useApp();
  const w = partWords(settings.partWord);
  const [x, setX] = useState(p);
  const isNew = !parts.some((y) => y.id === p.id);
  const save = async () => {
    if (!x.name.trim()) return;
    await store.put('parts', { ...x, name: x.name.trim() });
    toast('Saved.');
    onClose();
  };
  return (
    <Sheet title={isNew ? `Add a ${w.one}` : x.name} onClose={onClose}>
      <label className="field"><span>Name</span><input className="input" value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} autoFocus placeholder="Name, nickname or description" /></label>
      <div className="grid2">
        <label className="field"><span>Pronouns</span><input className="input" value={x.pronouns ?? ''} onChange={(e) => setX({ ...x, pronouns: e.target.value })} /></label>
        <label className="field"><span>Age (if known)</span><input className="input" value={x.age ?? ''} onChange={(e) => setX({ ...x, age: e.target.value })} /></label>
      </div>
      <label className="field"><span>Role in the system</span><input className="input" value={x.role ?? ''} onChange={(e) => setX({ ...x, role: e.target.value })} placeholder="e.g. protector, little, caretaker" /></label>
      <label className="field"><span>Notes</span><textarea className="input" value={x.notes ?? ''} onChange={(e) => setX({ ...x, notes: e.target.value })} placeholder="What helps them feel safe? What do they like?" /></label>
      <div className="eyebrow">Color</div>
      <div className="chips" style={{ marginBottom: '.8rem' }}>
        {PALETTE.map((c) => <button key={c} type="button" className="chip" aria-label={`Color ${c}`} aria-pressed={x.color === c} onClick={() => setX({ ...x, color: c })}><span className="dot" style={{ background: c, width: 18, height: 18 }} /></button>)}
      </div>
      <div className="row">
        <button className="btn primary" onClick={save} disabled={!x.name.trim()}>Save</button>
        {!isNew && <button className="btn ghost" onClick={async () => { await store.patch('parts', p.id, { archived: !p.archived }); toast(p.archived ? 'Restored.' : 'Moved to resting — history is kept.'); onClose(); }}>{p.archived ? 'Restore' : 'Mark as resting / dormant'}</button>}
      </div>
    </Sheet>
  );
}

export default function Circle() {
  const { members, parts, settings, me, go } = useApp();
  const [editM, setEditM] = useState<Member | null>(null);
  const [editP, setEditP] = useState<Part | null>(null);
  const [inviting, setInviting] = useState(false);
  const roster = useRoster();
  const invites = useAll('invitations');
  const shares = useAll('careShares');
  const w = partWords(settings.partWord);
  const tracked = members.filter((m) => m.tracked);

  const newMember = (): Member => ({ id: uid(), name: '', role: 'family', tracked: false, canView: true, canObserve: true, color: PALETTE[members.length % PALETTE.length], createdAt: Date.now() });
  const newPart = (memberId: string): Part => ({ id: uid(), memberId, name: '', color: PALETTE[(parts.length + 2) % PALETTE.length], createdAt: Date.now() });

  return (
    <div className="fade-in">
      <PageHead title="Trust circle" sub="The people who help, and the system within." />
      <div className="row" style={{ marginBottom: '.9rem' }}>
        <button className="btn sm" onClick={() => go({ name: 'appointments' })}><Icon name="clock" size={16} /> Appointments</button>
        <button className="btn sm" onClick={() => go({ name: 'support' })}><Icon name="heart" size={16} /> Find support</button>
        <button className="btn sm" onClick={() => go({ name: 'account' })}><Icon name="people" size={16} /> Connect devices & invite</button>
        <button className="btn sm" onClick={() => go({ name: 'careteam' })}><Icon name="shield" size={16} /> Therapist &amp; care team</button>
        <button className="btn sm" onClick={() => go({ name: 'supporters' })}><Icon name="heart" size={16} /> Supporting someone</button>
      </div>
      <div className="card">
        <div className="row between"><h2 style={{ margin: 0 }}>People</h2>
          <div className="row">{roster.canInvite && <button className="btn sm" onClick={() => setInviting(true)}><Icon name="people" size={16} /> Invite</button>}
            <button className="btn sm" onClick={() => setEditM(newMember())}><Icon name="plus" size={17} /> Add</button></div></div>
        <div style={{ marginTop: '.6rem' }}>
          {members.map((m) => (
            <button key={m.id} className="entry" style={{ background: 'none', border: 0, padding: '.6rem 0', alignItems: 'center' }} onClick={() => setEditM(m)}>
              <span className="brand-mark" style={{ background: m.color, color: '#fff', fontWeight: 700, width: 38, height: 38 }}>{m.name.charAt(0)}</span>
              <span style={{ flex: 1 }}><b>{m.name}</b>{m.id === me?.id && <span className="muted small"> (you)</span>}<br />
                <span className="small muted">{roleLabel(m)}{m.tracked ? ' · tracked' : ''}</span>
                {(() => { const st = personStatus(m, roster, invites, shares); return st ? <><br /><span className={`tag access-tag`} data-status={st}>{st}</span></> : null; })()}</span>
              <Icon name="edit" size={18} />
            </button>
          ))}
        </div>
        <p className="tiny muted" style={{ marginTop: '.6rem', marginBottom: 0 }}>{roster.connected ? 'Tap a person to invite them, see whether they’ve joined, or choose what they can see and do.' : 'Everyone here uses this device for now. Connect your circle online to invite people to use iDID on their own devices.'}</p>
      </div>
      <InvitationsCard roster={roster} />

      {tracked.map((t) => {
        const ps = parts.filter((p) => p.memberId === t.id);
        const active = ps.filter((p) => !p.archived), resting = ps.filter((p) => p.archived);
        return (
          <div className="card" key={t.id}>
            <div className="row between"><h2 style={{ margin: 0 }}>{t.id === me?.id ? `My ${w.many}` : `${t.name}'s ${w.many}`}</h2>
              <button className="btn sm" onClick={() => setEditP(newPart(t.id))}><Icon name="plus" size={17} /> Add</button></div>
            <div className="row" style={{ marginTop: '.6rem', gap: '.45rem' }}>
              <button className="btn sm" onClick={() => go({ name: 'board' })}><Icon name="board" size={16} /> Inner board</button>
              {t.id === me?.id && <button className="btn sm" onClick={() => go({ name: 'front' })}><Icon name="front" size={16} /> Who's here</button>}
            </div>
            {active.length === 0 && <p className="small muted" style={{ marginTop: '.6rem' }}>No {w.many} added yet. Add them whenever it feels right — or never. Both are okay.</p>}
            <div className="chips" style={{ marginTop: '.7rem' }}>
              {active.map((p) => <button key={p.id} className="chip" onClick={() => setEditP(p)}><span className="dot" style={{ background: p.color }} />{p.name}{p.pronouns ? <span className="muted small">({p.pronouns})</span> : null}</button>)}
            </div>
            {resting.length > 0 && <details style={{ marginTop: '.7rem' }}><summary className="small muted">Resting ({resting.length})</summary>
              <div className="chips" style={{ marginTop: '.5rem' }}>{resting.map((p) => <button key={p.id} className="chip" onClick={() => setEditP(p)}><span className="dot" style={{ background: p.color }} />{p.name}</button>)}</div></details>}
          </div>
        );
      })}
      {editM && <MemberForm m={editM} roster={roster} onClose={() => setEditM(null)} />}
      {inviting && <InviteSheet onClose={() => setInviting(false)} />}
      {editP && <PartForm p={editP} onClose={() => setEditP(null)} />}
    </div>
  );
}
