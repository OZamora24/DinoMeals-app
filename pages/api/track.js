import { ordersByTokens } from '../../lib/db';
import { rateLimit } from '../../lib/rateLimit';
import { publicOrder, trackOf } from '../../lib/orderView';

// Public — status for the orders saved in a customer's "My orders" list.
// Needs each order's private code; returns the same public fields as /o/<code>.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!rateLimit(req, 'track', 30, 60 * 1000)) return res.status(429).json({ orders: [] });
  res.setHeader('Cache-Control', 'no-store');
  const tokens = String(req.query.t || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  try {
    const rows = await ordersByTokens(tokens);
    return res.status(200).json({ orders: rows.map((o) => ({ ...publicOrder(o), track: trackOf(o)?.key })) });
  } catch (e) {
    console.error('track', e?.message);
    return res.status(200).json({ orders: [] });
  }
}
