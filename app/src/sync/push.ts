import { currentRemote, getAccount, scheduleServerReminders } from './account';
import { VAPID_PUBLIC_KEY } from './supabase';

export function pushAvailable() {
  return !!VAPID_PUBLIC_KEY && getAccount().phase === 'connected' && typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator;
}

function keyBytes(b64url: string) {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Subscribe this device to Web Push and register it with the server. */
export async function enablePush(): Promise<boolean> {
  const remote = currentRemote();
  if (!pushAvailable() || !remote) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY!) }));
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return false;
  await remote.savePushSubscription({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
  await scheduleServerReminders();
  return true;
}
