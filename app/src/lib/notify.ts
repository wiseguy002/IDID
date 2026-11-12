/**
 * On-device notifications. Text is deliberately generic so nothing private
 * appears on a lock screen; details are only shown inside the unlocked app.
 */
export function notificationsSupported() {
  return typeof Notification !== 'undefined';
}

export function permission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

export async function showLocal(title: string, body: string, tag: string) {
  if (permission() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(title, { body, tag, icon: './favicon.svg', badge: './favicon.svg', silent: true }); return; }
  } catch { /* fall through */ }
  try { new Notification(title, { body, tag, icon: './favicon.svg', silent: true }); } catch { /* unsupported in this context */ }
}

export function reminderText(minutesBefore: number) {
  if (minutesBefore === 0) return 'An appointment is starting now.';
  if (minutesBefore < 60) return `You have an appointment in ${minutesBefore} minutes.`;
  if (minutesBefore < 1440) return `You have an appointment in ${minutesBefore / 60} hour${minutesBefore === 60 ? '' : 's'}.`;
  return minutesBefore === 1440 ? 'You have an appointment tomorrow.' : `You have an appointment in ${minutesBefore / 1440} days.`;
}
