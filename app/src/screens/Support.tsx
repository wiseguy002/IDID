import { useEffect, useState } from 'react';
import { store, track, uid, useAll } from '../db';
import { useApp } from '../state';
import { CRISIS, NEEDS, VERIFIED_ON, isZip, matchResources } from '../lib/resources';
import { CONTACT_ROLES, type ContactRole, type Member, type SupportContact, type SupportNeed } from '../types';
import { ResourceCard } from '../components/ResourceCard';
import { ChipSelect, PageHead, Sheet, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

export function CrisisCard() {
  return (
    <div className="card warm" style={{ marginBottom: '.9rem' }}>
      <h3 style={{ marginBottom: '.25rem' }}>Need help right now?</h3>
      <p className="small" style={{ margin: '0 0 .6rem' }}>If you or someone else is in immediate danger, call <b>911</b>. For any kind of emotional crisis, you can reach a trained counsellor any time, free:</p>
      <div className="row" style={{ gap: '.45rem' }}>
        <a className="btn sm primary" href="tel:988">Call 988</a>
        <a className="btn sm" href="sms:988">Text 988</a>
        <a className="btn sm" href="https://988lifeline.org/chat/" target="_blank" rel="noopener noreferrer">Chat with 988</a>
        <a className="btn sm" href="sms:741741?&body=HOME">Text HOME to 741741</a>
      </div>
      <p className="tiny muted" style={{ margin: '.5rem 0 0' }}>988 also offers support in Spanish. Veterans: dial 988, then press 1.</p>
    </div>
  );
}

function blankContact(memberId: string): SupportContact {
  return { id: uid(), memberId, name: '', role: 'therapist', phone: '', email: '', website: '', address: '', notes: '', pinned: true, createdAt: Date.now() };
}

export function ContactForm({ c, onClose }: { c: SupportContact; onClose: () => void }) {
  const { toast } = useApp();
  const [x, setX] = useState(c);
  const isNew = !store.get('contacts', c.id);
  const set = <K extends keyof SupportContact>(k: K, v: SupportContact[K]) => setX((p) => ({ ...p, [k]: v }));
  const save = async () => {
    const web = x.website.trim();
    await store.put('contacts', { ...x, name: x.name.trim(), website: web && !/^https?:\/\//i.test(web) ? `https://${web}` : web });
    toast(isNew ? 'Contact saved.' : 'Saved.');
    onClose();
  };
  return (
    <Sheet title={isNew ? 'Add a support contact' : x.name} onClose={onClose}>
      <label className="field"><span>Name</span><input id="ct-name" className="input" value={x.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Dr. Lee, Riverside Crisis Center" autoFocus /></label>
      <div className="eyebrow">Role</div>
      <ChipSelect multi={false} value={[x.role]} onChange={(v) => v[0] && set('role', v[0] as ContactRole)} options={CONTACT_ROLES} />
      <div className="grid2" style={{ marginTop: '.8rem' }}>
        <label className="field"><span>Phone</span><input id="ct-phone" className="input" type="tel" inputMode="tel" value={x.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label className="field"><span>Email</span><input id="ct-email" className="input" type="email" value={x.email} onChange={(e) => set('email', e.target.value)} /></label>
      </div>
      <label className="field"><span>Website</span><input id="ct-web" className="input" type="url" value={x.website} onChange={(e) => set('website', e.target.value)} placeholder="example.org" /></label>
      <label className="field"><span>Address</span><input id="ct-addr" className="input" value={x.address} onChange={(e) => set('address', e.target.value)} /></label>
      <label className="field"><span>Notes</span><textarea id="ct-notes" className="input" value={x.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Hours, who to ask for, what they help with" /></label>
      <Switch label="Show on the Pause screen" hint="Keep this contact one tap away in hard moments" checked={x.pinned} onChange={(v) => set('pinned', v)} />
      <div className="row">
        <button className="btn primary" disabled={!x.name.trim()} onClick={save}>Save</button>
        {!isNew && <button className="btn ghost danger" onClick={async () => { await store.remove('contacts', c.id); toast('Contact removed.'); onClose(); }}>Remove</button>}
      </div>
    </Sheet>
  );
}

export function ContactRow({ c, onEdit }: { c: SupportContact; onEdit?: () => void }) {
  const role = CONTACT_ROLES.find((r) => r.value === c.role)?.label;
  const tel = c.phone.replace(/[^\d+]/g, '');
  return (
    <div style={{ padding: '.6rem 0', borderBottom: '1px solid var(--line)' }}>
      <div className="row between" style={{ flexWrap: 'nowrap' }}>
        <div style={{ minWidth: 0 }}><b>{c.name}</b> <span className="small muted">· {role}</span>
          {c.phone && <div className="small" style={{ userSelect: 'all' }}>{c.phone}</div>}
          {c.notes && <div className="tiny muted">{c.notes}</div>}
        </div>
        {onEdit && <button className="iconbtn" aria-label={`Edit ${c.name}`} onClick={onEdit}><Icon name="edit" size={18} /></button>}
      </div>
      <div className="row" style={{ gap: '.4rem', marginTop: '.35rem' }}>
        {tel && <a className="btn sm" href={`tel:${tel}`}>Call</a>}
        {tel && <a className="btn sm" href={`sms:${tel}`}>Text</a>}
        {c.email && <a className="btn sm" href={`mailto:${c.email}`}>Email</a>}
        {c.website && <a className="btn sm" href={c.website} target="_blank" rel="noopener noreferrer">Website</a>}
        {c.address && <a className="btn sm" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer">Map</a>}
      </div>
    </div>
  );
}

/** ZIP and needs editor, used here and during setup. */
export function SupportProfileEditor({ zip, needs, onZip, onNeeds }: { zip: string; needs: SupportNeed[]; onZip: (z: string) => void; onNeeds: (n: SupportNeed[]) => void }) {
  return (
    <>
      <label className="field"><span>ZIP code</span>
        <input id="sp-zip" className="input" inputMode="numeric" autoComplete="postal-code" maxLength={5} style={{ maxWidth: 160 }} value={zip}
          onChange={(e) => onZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="e.g. 43215" /></label>
      {zip && !isZip(zip) && <p className="small" style={{ color: 'var(--warm)', marginTop: '-.5rem' }}>Enter all 5 digits.</p>}
      <div className="eyebrow">What would help? <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>Choose any.</span></div>
      <ChipSelect value={needs} onChange={(v) => onNeeds(v as SupportNeed[])} options={NEEDS} />
    </>
  );
}

export default function Support() {
  const { me, members, go, toast } = useApp();
  const tracked = members.filter((m) => m.tracked);
  const people = tracked.length ? tracked : members;
  const [whoId, setWhoId] = useState((me?.tracked ? me : people[0])?.id ?? '');
  const who: Member | undefined = members.find((m) => m.id === whoId);
  const [editing, setEditing] = useState(!who?.support?.zip);
  const [zip, setZip] = useState(who?.support?.zip ?? '');
  const [needs, setNeeds] = useState<SupportNeed[]>(who?.support?.needs ?? ['did', 'trauma']);
  const [contact, setContact] = useState<SupportContact | null>(null);
  const contacts = useAll('contacts').filter((c) => c.memberId === whoId);
  useEffect(() => { track(me?.id, 'support-viewed'); }, [me?.id]);

  const pick = (id: string) => {
    const m = members.find((x) => x.id === id);
    setWhoId(id); setZip(m?.support?.zip ?? ''); setNeeds(m?.support?.needs ?? ['did', 'trauma']); setEditing(!m?.support?.zip);
  };
  const save = async () => {
    if (!who) return;
    await store.patch('members', who.id, { support: { zip: zip.trim(), needs } });
    setEditing(false);
    toast('Saved. Here is what we found.');
  };
  const copy = (z: string) => navigator.clipboard?.writeText(z).then(() => toast(`Copied ${z}.`), () => toast(`Your ZIP is ${z}.`));

  const saved = who?.support;
  const z = saved && isZip(saved.zip) ? saved.zip : undefined;
  const n = saved?.needs ?? [];
  const isSelf = who?.id === me?.id;

  return (
    <div className="fade-in">
      <PageHead title="Find support" sub="Crisis lines, specialists, and people who understand." onBack={() => go({ name: 'home' })} />
      <CrisisCard />

      {people.length > 1 && (
        <div style={{ marginBottom: '.8rem' }}>
          <div className="eyebrow">Support for</div>
          <ChipSelect multi={false} value={[whoId]} onChange={(v) => v[0] && pick(v[0])} options={people.map((m) => ({ value: m.id, label: m.id === me?.id ? `Me (${m.name})` : m.name, color: m.color }))} />
        </div>
      )}

      {editing ? (
        <div className="card">
          <h2>{isSelf ? 'Your' : `${who?.name}'s`} support profile</h2>
          <p className="small muted">Your ZIP code and needs are encrypted like the rest of your journal. A website only sees your ZIP if you tap a link that includes it.</p>
          <SupportProfileEditor zip={zip} needs={needs} onZip={setZip} onNeeds={setNeeds} />
          <div className="row" style={{ marginTop: '.9rem' }}>
            <button className="btn primary" disabled={!!zip && !isZip(zip)} onClick={save}>Show support</button>
            {saved && <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </div>
      ) : (
        <div className="card soft row between">
          <div className="small"><b>{z ? `Near ${z}` : 'No ZIP code saved'}</b>{n.length > 0 && <> · {n.map((x) => NEEDS.find((y) => y.value === x)?.label).join(', ')}</>}</div>
          <button className="btn sm" onClick={() => setEditing(true)}><Icon name="edit" size={15} /> Change</button>
        </div>
      )}

      {!editing && (
        <>
          <h2 style={{ marginTop: '1.3rem' }}>Near you</h2>
          {!z && <p className="small muted">Add a ZIP code to see services near you. These directories also work without one.</p>}
          {matchResources(n, 'near').map((r) => <ResourceCard key={r.id} r={r} zip={z} onCopy={copy} />)}

          <h2 style={{ marginTop: '1.3rem' }}>Talk to someone</h2>
          {[...CRISIS.slice(1), ...matchResources(n, 'talk')].map((r) => <ResourceCard key={r.id} r={r} zip={z} onCopy={copy} />)}

          <h2 style={{ marginTop: '1.3rem' }}>Learn & connect</h2>
          {matchResources(n, 'learn').map((r) => <ResourceCard key={r.id} r={r} />)}
        </>
      )}

      <div className="card" style={{ marginTop: '1.3rem' }}>
        <div className="row between"><h2 style={{ margin: 0 }}>{isSelf ? 'My' : `${who?.name}'s`} support contacts</h2>
          <button className="btn sm" onClick={() => setContact(blankContact(whoId))}><Icon name="plus" size={16} /> Add</button></div>
        {contacts.length === 0
          ? <p className="small muted" style={{ marginTop: '.5rem', marginBottom: 0 }}>Keep your therapist, social worker, counsellor, local crisis center or group here, ready to call or text.</p>
          : contacts.map((c) => <ContactRow key={c.id} c={c} onEdit={() => setContact(c)} />)}
      </div>

      <p className="tiny muted">Services listed are run by other organisations. IDID doesn't endorse specific providers, and listings can change. Contact details checked {VERIFIED_ON}. Outside the US, contact your local emergency number.</p>
      {contact && <ContactForm c={contact} onClose={() => setContact(null)} />}
    </div>
  );
}
