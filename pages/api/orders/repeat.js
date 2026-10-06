import { getOrder, insertOrder, getSettings } from '../../../lib/db';
import { isValidSession } from '../../../lib/adminSession';
import { priceCart, cookDateFor, laNow } from '../../../lib/menu';
import { linesToCart } from '../../../lib/cart';

// Admin: copy one or more past orders into a cook week (default: the
// current one) — the "regulars who order the same thing every week" button.
// Prices are recomputed from today's menu; the copy starts unpaid.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isValidSession(req)) return res.status(401).json({ error: 'Not logged in' });
  try {
    const settings = await getSettings();
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [req.body?.id].filter(Boolean);
    const cook_date = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.cook_date || '')
      ? req.body.cook_date
      : cookDateFor(laNow(), settings.cutoff_day, settings.cutoff_hour);
    const created = [];
    for (const id of ids) {
      const o = await getOrder(id);
      if (!o) continue;
      const cart = linesToCart(o.items);
      const priced = priceCart(cart);
      const hasItems = priced.ok;
      const fee = o.fulfillment === 'delivery' && hasItems ? Number(settings.delivery_fee) || 0 : 0;
      const { id: _i, order_no: _n, created_at: _c, ...rest } = o;
      created.push(
        await insertOrder({
          ...rest,
          cook_date,
          items: hasItems ? priced.lines : o.items,
          subtotal: hasItems ? priced.subtotal : o.subtotal,
          delivery_fee: fee,
          total: hasItems ? priced.subtotal + fee : o.total,
          paid: false,
          paid_at: null,
          status: hasItems ? 'new' : 'quote',
          source: 'repeat',
          route_pos: null,
        })
      );
    }
    return res.status(200).json({ orders: created });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
