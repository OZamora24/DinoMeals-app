import { getOrderByToken, getSettings } from '../../lib/db';
import { rateLimit } from '../../lib/rateLimit';
import { againCart, againInfo } from '../../lib/again';
import { cookDateFor, laNow } from '../../lib/menu';

// "Same as last week?" link from the Thursday text (lib/again.js): GET ?token=<order's private code>
// -> the cart + checkout details to load on the order page. The code is the same private code as the
// customer's own order page (/o/<code>), so this shows nothing that page doesn't.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  if (!rateLimit(req, 'again', 20, 10 * 60 * 1000)) return res.status(429).json({ error: 'slow_down' });
  try {
    const token = String(req.query.token || '').slice(0, 80);
    const o = token ? await getOrderByToken(token) : null;
    if (!o || o.status === 'cancelled') return res.status(404).json({ error: 'not_found' });
    const s = await getSettings();
    const { cart, removed, flavorReset } = againCart(o, s.sold_out);
    return res.status(200).json({
      cart,
      info: againInfo(o),
      trainer: (o.trainer && o.trainer.code) || null,
      removed,
      flavorReset,
      cook_date: cookDateFor(laNow(), s.cutoff_day, s.cutoff_hour),
    });
  } catch (e) {
    console.error('again', e);
    return res.status(500).json({ error: 'server' });
  }
}
