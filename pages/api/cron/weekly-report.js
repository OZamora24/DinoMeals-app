// Monday 8 PM Pacific: email the kitchen last week's (Mon–Sun) sales report as an Excel file.
// Called by Vercel Cron (see vercel.json). Vercel cron runs in UTC, so there are two schedules
// (one lands on 8 PM during daylight time, one during standard time) and this handler only sends
// when it's really Monday 8 PM in Los Angeles. Needs RESEND_API_KEY (lib/mailer.js).
import { getSettings, saveSettings, listOrders } from '../../../lib/db';
import { laNow } from '../../../lib/menu';
import { mailStatus, sendMail } from '../../../lib/mailer';
import { previousWeek, mondayOf, runWeeklyReport } from '../../../lib/weeklyReport';

export const REPORT_DAY = 1; // Monday
export const REPORT_HOUR = 20; // 8 PM Pacific

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });

  const now = laNow();
  const force = req.query.force === '1';
  if (!force && !(now.getDay() === REPORT_DAY && now.getHours() === REPORT_HOUR)) {
    return res.status(200).json({ skipped: 'not Monday 8 PM in Los Angeles' });
  }
  if (!mailStatus().configured) return res.status(200).json({ skipped: 'email is not set up (RESEND_API_KEY missing)' });

  const start = /^\d{4}-\d{2}-\d{2}$/.test(req.query.week || '') ? mondayOf(req.query.week) : previousWeek(now).start;
  const s = await getSettings({ fresh: true });
  if (!force && s.last_report_week === start) return res.status(200).json({ skipped: 'already sent', week: start });

  const r = await runWeeklyReport({ start, listOrders: () => listOrders(), send: (m) => sendMail(m) });
  if (r.ok) await saveSettings({ last_report_week: start });
  return res.status(200).json({ week: start, ok: r.ok, error: r.error || null, orders: r.stats.orders, weeks: r.weekCount });
}
