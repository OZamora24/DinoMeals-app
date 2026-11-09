// Tuesday 6 PM Pacific: "🦖 How were your meals this week? Tap to rate" to every phone with
// notifications on, when there was a cook day this past Sunday. The tap opens /rate, which finds
// that phone's latest order and its review form (lib/reviews.js). Vercel Cron (vercel.json) runs
// in UTC, so there are two schedules; this only sends when it's really Tuesday 6 PM in Los Angeles,
// and never twice for the same week.
import { getSettings, saveSettings, listOrders } from '../../../lib/db';
import { laNow, dateKey, addDays } from '../../../lib/menu';
import { sendPromoToCustomers, pushConfigured } from '../../../lib/push';

export const ASK_DAY = 2; // Tuesday
export const ASK_HOUR = 18; // 6 PM Pacific

export const REVIEW_PUSH = {
  id: 'review-ask',
  title: '🦖 DinoMeals',
  body: 'How were your meals this week? Tap to rate them, it takes 10 seconds ⭐',
  title_es: '🦖 DinoMeals',
  body_es: '¿Qué tal tus comidas esta semana? Toca para calificarlas, toma 10 segundos ⭐',
  url: '/rate',
};

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });
  const now = laNow();
  const force = req.query.force === '1';
  if (!force && !(now.getDay() === ASK_DAY && now.getHours() === ASK_HOUR)) return res.status(200).json({ skipped: 'not Tuesday 6 PM in Los Angeles' });
  if (!pushConfigured()) return res.status(200).json({ skipped: 'push not configured' });
  const sunday = addDays(dateKey(now), -now.getDay()); // this past Sunday
  const s = await getSettings({ fresh: true });
  if (!force && s.last_review_ask === sunday) return res.status(200).json({ skipped: 'already sent', week: sunday });
  const week = (await listOrders({ cookDate: sunday })).filter((o) => o.status !== 'cancelled');
  if (!week.length) return res.status(200).json({ skipped: 'no orders this week', week: sunday });
  const r = await sendPromoToCustomers(REVIEW_PUSH);
  await saveSettings({ last_review_ask: sunday });
  return res.status(200).json({ week: sunday, sent: r.sent, failed: r.failed });
}
