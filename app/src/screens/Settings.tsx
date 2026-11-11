import { useState } from 'react';
import { updateSettings, wipeAll } from '../db';
import { useApp } from '../state';
import { hashPin } from '../lib/util';
import type { PartWord, TextSize, ThemeName } from '../types';
import { PageHead, Segmented, Sheet, Switch } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Settings() {
  const { settings: s, go, toast } = useApp();
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [wipe, setWipe] = useState(false);
  const [wipeText, setWipeText] = useState('');
  const up = (p: Parameters<typeof updateSettings>[0]) => updateSettings(p);

  const savePin = async () => {
    const salt = crypto.randomUUID();
    await up({ pinHash: await hashPin(pin, salt), pinSalt: salt });
    setPin(''); setPin2(''); setPinOpen(false);
    toast('Passcode set. IDID will ask for it when it opens.');
  };

  return (
    <div className="fade-in">
      <PageHead title="Settings" onBack={() => go({ name: 'home' })} />
      <div className="card">
        <h2>Comfort</h2>
        <div className="eyebrow">Colours</div>
        <Segmented label="Theme" value={s.theme} onChange={(v: ThemeName) => up({ theme: v })}
          options={[{ value: 'morning', label: 'Morning' }, { value: 'meadow', label: 'Meadow' }, { value: 'dusk', label: 'Dusk' }, { value: 'clear', label: 'High contrast' }]} />
        <div className="eyebrow" style={{ marginTop: '.9rem' }}>Text size</div>
        <Segmented label="Text size" value={s.textSize} onChange={(v: TextSize) => up({ textSize: v })}
          options={[{ value: 'small', label: 'A' }, { value: 'medium', label: 'A+' }, { value: 'large', label: 'A++' }, { value: 'xlarge', label: 'A+++' }]} />
        <Switch label="Calm motion" hint="No animations, slides or movement" checked={s.reduceMotion} onChange={(v) => up({ reduceMotion: v })} />
        <Switch label="Extra-readable text" hint="Wider spacing and a clearer typeface" checked={s.readableFont} onChange={(v) => up({ readableFont: v })} />
        <Switch label="Rounded shapes" hint="Turn off for simpler, squarer edges" checked={s.softEdges} onChange={(v) => up({ softEdges: v })} />
        <p className="tiny muted" style={{ margin: 0 }}>IDID never plays sounds, vibrates, or flashes.</p>
      </div>
      <div className="card">
        <h2>Language & prompts</h2>
        <label className="field"><span>Name of this space</span><input className="input" value={s.circleName} onChange={(e) => up({ circleName: e.target.value })} placeholder="IDID" /></label>
        <div className="eyebrow">I call them</div>
        <Segmented label="Word for parts" value={s.partWord} onChange={(v: PartWord) => up({ partWord: v })}
          options={[{ value: 'parts', label: 'Parts' }, { value: 'alters', label: 'Alters' }, { value: 'headmates', label: 'Headmates' }, { value: 'selves', label: 'Selves' }]} />
        <Switch label="Looking-back check-ins" hint="When you return, gently ask if there's anything to add about a recent moment" checked={s.showCheckIn} onChange={(v) => up({ showCheckIn: v })} />
      </div>
      <div className="card">
        <h2>Privacy</h2>
        <p className="small muted">All information is stored only in this browser on this device.</p>
        {s.pinHash ? (
          <div className="row"><span className="tag"><Icon name="lock" size={14} /> Passcode on</span>
            <button className="btn sm" onClick={async () => { await up({ pinHash: null, pinSalt: null }); toast('Passcode removed.'); }}>Remove passcode</button></div>
        ) : <button className="btn" onClick={() => setPinOpen(true)}><Icon name="lock" size={18} /> Set a passcode</button>}
        <hr className="hr" />
        <button className="btn" onClick={() => go({ name: 'share' })}><Icon name="download" size={18} /> Export & backup</button>
        <button className="btn ghost danger" style={{ marginLeft: '.4rem' }} onClick={() => setWipe(true)}>Delete all data</button>
      </div>
      <div className="card soft small">
        <h3>About IDID</h3>
        <p>IDID is a private journal for noticing dissociative and trauma-related experiences, and for gathering gentle observations from people you trust. It is not a diagnostic tool or a substitute for professional care.</p>
        <p style={{ margin: 0 }}>If you are in danger or thinking about harming yourself, please contact local emergency services. In the US, call or text <b>988</b>. In the UK & Ireland, Samaritans: <b>116 123</b>.</p>
      </div>

      {pinOpen && (
        <Sheet title="Set a passcode" onClose={() => setPinOpen(false)}>
          <p className="small muted">4–8 digits. If you forget it, the only way back in is to clear this browser's data — so keep a backup.</p>
          <label className="field"><span>Passcode</span><input className="input" inputMode="numeric" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} autoFocus /></label>
          <label className="field"><span>Again, to confirm</span><input className="input" inputMode="numeric" type="password" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 8))} /></label>
          <button className="btn primary" disabled={pin.length < 4 || pin !== pin2} onClick={savePin}>Save passcode</button>
        </Sheet>
      )}
      {wipe && (
        <Sheet title="Delete everything?" onClose={() => setWipe(false)}>
          <p>This permanently removes every person, entry and note from this device. Download a backup first if you might want them later.</p>
          <label className="field"><span>Type <b>delete</b> to confirm</span><input className="input" value={wipeText} onChange={(e) => setWipeText(e.target.value)} /></label>
          <button className="btn primary" disabled={wipeText.trim().toLowerCase() !== 'delete'} onClick={wipeAll}>Delete all data</button>
        </Sheet>
      )}
    </div>
  );
}
