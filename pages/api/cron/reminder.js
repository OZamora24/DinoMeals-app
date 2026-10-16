// Weekly "orders close soon" text — Thursday 4 PM Pacific — to customers who ticked
// the separate reminder box at checkout. Called by Vercel Cron (see vercel.json).
// Vercel cron runs in UTC and Hobby plans fire anywhere inside the scheduled hour, so
// there are two schedules (one lands on 4 PM during daylight time, one during standard
// time) and this handler only sends when it's really Thursday 4 PM in Los Angeles.
// Nothing goes out unless SMS_ENABLED=true (texts stay off until the carrier approves).
import { getSettings, reminderSubscribers, updateReminder } from '../../../lib/db';
import { reminderMessage, sendText, smsStatus } from '../../../lib/sms';
import { cookDateFor, laNow } from '../../../lib/menu';

export const REMINDER_DAY = 4; // Thursday
export const REMINDER_HOUR = 16; // 4 PM Pacific

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });

  const now = laNow();
  const force = req.query.force === '1';
  if (!force && !(now.getDay() === REMINDER_DAY && now.getHours() === REMINDER_HOUR)) {
    return res.status(200).json({ skipped: 'not Thursday 4 PM in Los Angeles' });
  }
  if (!smsStatus().live) return res.status(200).json({ skipped: 'texts are off' });
  const s = await getSettings({ fresh: true });
  if (!s.ordering_open) return res.status(200).json({ skipped: 'ordering is closed this week' });

  const week = cookDateFor(now, s.cutoff_day, s.cutoff_hour);
  const subs = await reminderSubscribers();
  let sent = 0;
  let optedOut = 0;
  for (const r of subs) {
    if (r.last_sent_week === week) continue; // never twice in one week
    const out = await sendText(r.phone_digits, reminderMessage(r.lang, s));
    if (out.ok) {
      sent += 1;
      await updateReminder(r.phone_digits, { last_sent_week: week });
    } else if (out.code === 21610) {
      optedOut += 1; // they replied STOP — stop trying
      await updateReminder(r.phone_digits, { opted_out_at: new Date().toISOString() });
    }
  }
  return res.status(200).json({ week, subscribers: subs.length, sent, optedOut });
}
