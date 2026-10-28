import { getSettings } from '../../lib/db';
import { rateLimit } from '../../lib/rateLimit';
import { findPromo, normCode } from '../../lib/promo';
import { dateKey, laNow } from '../../lib/menu';

// Public: checks a promo code typed at checkout. Returns only that code's discount
// (never the list of codes). The order API checks it again when the order is placed.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  if (!rateLimit(req, 'promo-code', 20, 10 * 60 * 1000)) return res.status(429).json({ error: 'slow_down' });
  try {
    const code = normCode(req.query.code);
    if (!code) return res.status(400).json({ error: 'promo_invalid' });
    const s = await getSettings();
    const promo = findPromo(s.promo_codes, code, dateKey(laNow()));
    if (!promo) return res.status(404).json({ error: 'promo_invalid' });
    return res.status(200).json({ promo });
  } catch (e) {
    console.error('promo-code', e && e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
