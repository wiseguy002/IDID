/** Everything iDID keeps in localStorage: its own keys, and the sign-in session (sb-…). */
const OURS = /^(idid\.|sb-)/;

type Keys = Pick<Storage, 'length' | 'key' | 'removeItem'>;

/** Stop push notifications to this device (best effort; works offline too). */
export async function stopPush() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await (await reg?.pushManager?.getSubscription())?.unsubscribe();
  } catch { /* ignore */ }
}

export function clearLocalData(s: Keys) {
  const keys = Array.from({ length: s.length }, (_, i) => s.key(i));
  for (const k of keys) if (k && OURS.test(k)) s.removeItem(k);
}
