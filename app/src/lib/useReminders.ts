import { useEffect } from 'react';
import { store } from '../db';
import type { Member } from '../types';
import { checkInTimes, remindersBetween } from './schedule';
import { reminderText, showLocal } from './notify';

const LAST_KEY = 'idid.reminders.last';
const MAX_LOOKBACK = 6 * 3600000; // don't replay reminders older than 6 hours

function readLast() { try { return Number(localStorage.getItem(LAST_KEY)) || 0; } catch { return 0; } }
function writeLast(t: number) { try { localStorage.setItem(LAST_KEY, String(t)); } catch { /* ignore */ } }

/**
 * While the app is open and unlocked, fire due reminders as on-device notifications
 * (and in-app toasts). Push notifications from the server cover the time the app is closed.
 */
export function useReminders(me: Member | null, opts: { appointments: boolean; checkInTime: string | null }, toast: (m: string) => void) {
  useEffect(() => {
    if (!me) return;
    const tick = () => {
      if (!store.unlocked) return;
      const now = Date.now();
      const from = Math.max(readLast(), now - MAX_LOOKBACK);
      writeLast(now);
      if (opts.appointments) {
        const mine = store.all('appointments').filter((a) => !a.memberIds.length || a.memberIds.includes(me.id));
        for (const r of remindersBetween(mine, from, now)) {
          const body = reminderText(r.minutesBefore);
          showLocal('IDID reminder', body, `appt-${r.appointmentId}-${r.fireAt}`);
          toast(body);
        }
      }
      for (const t of checkInTimes(opts.checkInTime, from, now)) {
        showLocal('IDID', 'A gentle check-in: how are you all doing?', `checkin-${t}`);
      }
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [me, opts.appointments, opts.checkInTime, toast]);
}
