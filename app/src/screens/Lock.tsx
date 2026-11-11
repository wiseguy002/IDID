import { useState } from 'react';
import type { Settings } from '../types';
import { hashPin } from '../lib/util';
import { Icon } from '../components/Icon';

export default function Lock({ settings, onUnlock }: { settings: Settings; onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('Enter your passcode');
  const press = async (d: string) => {
    const next = (pin + d).slice(0, 8);
    setPin(next);
    if (next.length >= 4) {
      const h = await hashPin(next, settings.pinSalt ?? '');
      if (h === settings.pinHash) onUnlock();
      else if (next.length >= 8) { setPin(''); setMsg("That didn't match. Take your time."); }
    }
  };
  return (
    <div className="lock">
      <div style={{ textAlign: 'center' }}>
        <div className="brand-mark" style={{ width: 56, height: 56, margin: '0 auto' }}><Icon name="lock" size={26} /></div>
        <h2 style={{ marginTop: '1rem' }}>Welcome back</h2>
        <p className="muted">{msg}</p>
        <div className="pin-dots" aria-label={`${pin.length} digits entered`}>{Array.from({ length: Math.max(4, pin.length) }).map((_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}</div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
          <button onClick={() => setPin('')} aria-label="Clear" style={{ fontSize: '.9rem' }}>Clear</button>
          <button onClick={() => press('0')}>0</button>
          <button onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete last digit"><Icon name="back" /></button>
        </div>
      </div>
    </div>
  );
}
