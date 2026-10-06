import { ordersByPhone } from '../../lib/db';
import { normalizePhone } from '../../lib/orderRow';
import { linesToCart, cartKey } from '../../lib/cart';

// Public — a customer enters their OWN phone number to reload a past
// order ("order my usual"). Only returns what was ordered — never names,
// addresses, or anything else about the order.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const digits = normalizePhone(req.query.phone);
  if (digits.length !== 10) return res.status(200).json({ orders: [] });
  try {
    const rows = await ordersByPhone(digits, 20);
    const seen = new Set();
    const out = [];
    for (const o of rows) {
      const cart = linesToCart(o.items);
      if (!cart.meals.length && !cart.lbs.length) continue;
      const k = cartKey(cart);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ cart, fulfillment: o.fulfillment, payment_method: o.payment_method, created_at: o.created_at });
      if (out.length >= 3) break;
    }
    return res.status(200).json({ orders: out });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ orders: [] });
  }
}
