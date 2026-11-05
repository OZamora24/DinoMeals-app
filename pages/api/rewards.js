import { getSettings, ordersByPhone, saveSettings, isDemo, ordersReferredBy } from '../../lib/db';
import { referralCredits, referralConfig } from '../../lib/referral';
import { rateLimit } from '../../lib/rateLimit';
import { isValidSession } from '../../lib/adminSession';
import { normalizePhone } from '../../lib/orderRow';
import { loyaltyState, publicLoyalty, loyaltyConfig, addDaysYmd } from '../../lib/loyalty';
import { dateKey, laNow } from '../../lib/menu';

// Customer Loyalty Rewards.
//  GET  ?phone=…&lang=en       → public progress + any unlocked reward (checkout uses it)
//  GET  ?phone=…&full=1         → (admin) every reward earned, used, expired
//  POST { phone, milestone }    → (admin) renew an expired reward for another N days
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const admin = isValidSession(req);
    if (req.method === 'GET') {
      if (!admin && !rateLimit(req, 'rewards', 30, 10 * 60 * 1000)) return res.status(429).json({ error: 'slow_down' });
      const digits = normalizePhone(req.query.phone);
      if (digits.length !== 10) return res.status(400).json({ error: 'phone_required' });
      const s = await getSettings();
      const own = await ordersByPhone(digits, 500);
      const state = loyaltyState(own, dateKey(laNow()), s, digits);
      // Referral credits this customer earned by bringing friends (used automatically, up to 2 per order).
      const rc = referralConfig(s).on ? referralCredits(await ordersReferredBy(digits), own, dateKey(laNow()), s) : null;
      const credits = rc ? { available: rc.available, use: rc.use.length, pct: rc.pct } : null;
      if (admin && req.query.full) return res.status(200).json({ loyalty: state, credits: rc });
      return res.status(200).json({ loyalty: { ...publicLoyalty(state, req.query.lang === 'es' ? 'es' : 'en'), new_customer: own.every((o) => o.status === 'cancelled') }, credits });
    }
    if (req.method === 'POST') {
      if (!admin) return res.status(401).json({ error: 'Not logged in' });
      const digits = normalizePhone(req.body?.phone);
      const m = parseInt(req.body?.milestone, 10);
      if (digits.length !== 10 || !(m > 0) || m % 5) return res.status(400).json({ error: 'bad_request' });
      const s = await getSettings({ fresh: true });
      const cfg = loyaltyConfig(s);
      const renew = { ...cfg.renew, [`${digits}:${m}`]: addDaysYmd(dateKey(laNow()), cfg.expire_days) };
      await saveSettings({ loyalty: { ...(s.loyalty || {}), renew } });
      const state = loyaltyState(await ordersByPhone(digits, 500), dateKey(laNow()), { ...s, loyalty: { ...(s.loyalty || {}), renew } }, digits);
      return res.status(200).json({ loyalty: state, demo: isDemo() });
    }
    return res.status(405).end();
  } catch (e) {
    console.error('rewards', e && e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
