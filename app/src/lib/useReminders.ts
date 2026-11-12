import { useEffect } from 'react';
import { store } from '../db';
import type { DeviceSettings, Member } from '../types';
import { checkInTimes, remindersBetween } from './schedule';
import { reminderText, showLocal } from './notify';
import { NUDGE_NOTES, nudgeTimesBetween } from './nudges';
import { doseTimesBetween } from './body';

const LAST_KEY = 'idid.reminders.last';
const MAX_LOOKBACK = 6 * 3600000; // don't replay reminders older than 6 hours
export const NUDGE_DUE_WINDOW = 3 * 3600000; // a missed nudge still shows if under 3 hours old

function readLast() { try { return Number(localStorage.getItem(LAST_KEY)) || 0; } catch { return 0; } }
function writeLast(t: number) { try { localStorage.setItem(LAST_KEY, String(t)); } catch { /* ignore */ } }

/** Should this person get random check-ins on this device? */
export function nudgesFor(me: Member | null, d: DeviceSettings) {
  return !!me && me.tracked && d.nudges && d.nudgesPerDay > 0;
}

/**
 * While the app is open and unlocked, fire due reminders as on-device notifications
 * (and in-app toasts), and surface random check-ins. Push from the server covers
 * the time the app is closed.
 */
export function useReminders(me: Member | null, d: DeviceSettings, toast: (m: string) => void, onNudge: (at: number) => void) {
  useEffect(() => {
    if (!me) return;
    const tick = () => {
      if (!store.unlocked) return;
      const now = Date.now();
      const last = readLast();
      const from = Math.max(last, now - MAX_LOOKBACK);
      writeLast(now);
      if (d.notifyAppointments) {
        const mine = store.all('appointments').filter((a) => !a.memberIds.length || a.memberIds.includes(me.id));
        for (const r of remindersBetween(mine, from, now)) {
          const body = reminderText(r.minutesBefore);
          showLocal('iDID reminder', body, `appt-${r.appointmentId}-${r.fireAt}`);
          toast(body);
        }
      }
      if (d.notifyMeds) {
        for (const r of doseTimesBetween(store.all('meds').filter((m) => m.memberId === me.id && m.remind), from, now)) {
          showLocal('iDID', "A gentle reminder: it's time.", `med-${r.medId}-${r.at}`);
          toast("A gentle reminder: it's time for your medication.");
        }
      }
      for (const t of checkInTimes(d.checkInTime, from, now)) {
        showLocal('iDID', 'A gentle check-in: how are you all doing?', `checkin-${t}`);
      }
      if (nudgesFor(me, d)) {
        // Recent nudges (including ones missed while the app was closed), but nothing older than the due window.
        const due = nudgeTimesBetween(me.id, now - NUDGE_DUE_WINDOW, now, d.nudgesPerDay, d.quietStart, d.quietEnd);
        const latest = due[due.length - 1];
        if (latest) {
          if (latest >= from) showLocal('iDID', NUDGE_NOTES[latest % NUDGE_NOTES.length], `nudge-${latest}`);
          onNudge(latest);
        }
      }
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [me, d.notifyAppointments, d.notifyMeds, d.checkInTime, d.nudges, d.nudgesPerDay, d.quietStart, d.quietEnd, toast, onNudge]);
}
