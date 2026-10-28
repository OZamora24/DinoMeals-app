import { getSettings } from '../../lib/db';
import { rateLimit } from '../../lib/rateLimit';
import { publicPromo, sitePopup } from '../../lib/popups';
import { dateKey, laNow } from '../../lib/menu';

// Public: the text of a message that was sent as a notification, so the app can show it after the
// customer taps the notification (/?promo=<id>). Only messages that were really sent are returned.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  if (!rateLimit(req, 'promo', 60, 60 * 1000)) return res.status(429).json({ error: 'slow_down' });
  try {
    const s = await getSettings();
    // ?site=1 → the website pop-up for everyone (if one is on), or { promo: null }.
    if (req.query.site) return res.status(200).json({ promo: sitePopup(s.popups, dateKey(laNow())) });
    const promo = publicPromo(s.popups, String(req.query.id || ''));
    if (!promo) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ promo });
  } catch (e) {
    console.error('promo', e && e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
