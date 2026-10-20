import { listOrders } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { rateLimit } from '../../lib/rateLimit';
import { mailStatus, sendMail } from '../../lib/mailer';
import { previousWeek, mondayOf, runWeeklyReport, weekLabel } from '../../lib/weeklyReport';

// Admin: "Email last week's report now" (same report the Monday 8 PM cron sends).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isValidSession(req)) return res.status(401).json({ error: 'Not logged in' });
  if (!rateLimit(req, 'report', 6, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
  const st = mailStatus();
  if (!st.configured) return res.status(200).json({ ok: false, error: 'email_not_configured' });
  const wk = (req.body || {}).week;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(wk || '') ? mondayOf(wk) : previousWeek().start;
  try {
    const r = await runWeeklyReport({ start, listOrders: () => listOrders(), send: (m) => sendMail(m) });
    return res.status(200).json({ ok: r.ok, error: r.error || null, to: st.to, week: weekLabel(start), orders: r.stats.orders, weeks: r.weekCount });
  } catch (e) {
    console.error('report', e?.message);
    return res.status(500).json({ ok: false, error: 'report_failed' });
  }
}
