// Weekly "orders close soon" text — Thursday 4 PM Pacific — to customers who ticked
// the separate reminder box at checkout. Called by Vercel Cron (see vercel.json).
// Vercel cron runs in UTC and Hobby plans fire anywhere inside the scheduled hour, so
// there are two schedules (one lands on 4 PM during daylight time, one during standard
// time) and this handler only sends when it's really Thursday 4 PM in Los Angeles.
// Nothing goes out unless SMS_ENABLED=true (texts stay off until the carrier approves).
import { getSettings, reminderSubscribers, updateReminder, recentOrders, reviewedOrderIds, updateOrder } from '../../../lib/db';
import { reminderMessage, sendText, smsStatus, waitingLine, rateLine } from '../../../lib/sms';
import { orderToAsk } from '../../../lib/reviews';
import { orderForAgain, againLine } from '../../../lib/again';
import { cookDateFor, laNow, dateKey } from '../../../lib/menu';
import { loyaltyState } from '../../../lib/loyalty';
import { referralCredits, referralConfig } from '../../../lib/referral';

// "🎁 Waiting for you: 5% off (use by …)" for one phone, from all orders loaded once.
export function waitingFor(digits, all, today, s, lang) {
  const own = all.filter((o) => o.phone_digits === digits);
  const friends = all.filter((o) => o.referral && o.referral.by === digits);
  const rc = referralConfig(s).on ? referralCredits(friends, own, today, s) : null;
  return waitingLine(loyaltyState(own, today, s, digits), rc, lang);
}

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
  const today = dateKey(now);
  // Every order once (not one query per person) so the rewards line stays fast. If it fails,
  // the reminders still go out without it.
  const all = await recentOrders(3650).catch((e) => (console.error('reminder rewards', e?.message), null));
  // Reviews: orders already reviewed (to skip) for everyone on the list.
  const reviewed = await reviewedOrderIds(subs.map((r) => r.phone_digits)).catch(() => new Set());
  let sent = 0;
  let optedOut = 0;
  for (const r of subs) {
    if (r.last_sent_week === week) continue; // never twice in one week
    let extra = '';
    let ask = null;
    try { if (all) extra = waitingFor(r.phone_digits, all, today, s, r.lang); } catch {}
    // "🔁 Same as last week? … tap to reorder" for people who ordered lately but not yet for this Sunday.
    try {
      const again = all ? orderForAgain(all.filter((o) => o.phone_digits === r.phone_digits), week) : null;
      if (again && again.view_token) extra = [againLine(again, week, r.lang), extra].filter(Boolean).join(' ');
    } catch {}
    try {
      if (all) ask = orderToAsk(all.filter((o) => o.phone_digits === r.phone_digits), reviewed, today, new Date().toISOString());
      if (ask) extra = [extra, rateLine(ask.view_token, r.lang)].filter(Boolean).join(' ');
    } catch {}
    const out = await sendText(r.phone_digits, reminderMessage(r.lang, s, extra));
    if (out.ok) {
      sent += 1;
      if (ask) await updateOrder(ask.id, { review_asked_at: new Date().toISOString() }).catch((e) => console.error('review asked', e?.message));
      await updateReminder(r.phone_digits, { last_sent_week: week });
    } else if (out.code === 21610) {
      optedOut += 1; // they replied STOP — stop trying
      await updateReminder(r.phone_digits, { opted_out_at: new Date().toISOString() });
    }
  }
  return res.status(200).json({ week, subscribers: subs.length, sent, optedOut });
}
