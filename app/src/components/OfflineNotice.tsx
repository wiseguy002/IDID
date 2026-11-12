import { useEffect, useState } from 'react';

/** A quiet note when the device is offline. iDID itself keeps working. */
export function OfflineNotice() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="small" style={{ background: 'var(--warm-soft)', padding: '.5rem 1rem', textAlign: 'center' }}>
      You're offline. The internet is taking a little break, but iDID still works. Anything shared will sync when you're back.
    </div>
  );
}
