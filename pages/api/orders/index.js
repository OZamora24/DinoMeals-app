import { insertOrder, listOrders, updateOrder, deleteOrder, getOrder } from '../../../lib/db';
import { isValidSession } from '../../../lib/adminSession';
import { rateLimit } from '../../../lib/rateLimit';
import { notifyNewOrder } from '../../../lib/push';
import { buildOrderRow, PAY, STATUSES, clean } from '../../../lib/orderRow';

export default async function handler(req, res) {
  try {
    const admin = isValidSession(req);

    if (req.method === 'POST') {
      if (!admin && !rateLimit(req, 'order', 10, 10 * 60 * 1000)) return res.status(429).json({ error: 'rate_limited' });
      const wantAdmin = !!req.body?.as_admin;
      if (wantAdmin && !admin) return res.status(401).json({ error: 'Not logged in' });
      const built = await buildOrderRow(req.body || {}, { admin: wantAdmin });
      if (built.error) return res.status(400).json(built);
      const order = await insertOrder(built.row);
      // Ping the owner's devices; capped at 3s so a slow push service never delays the customer.
      if (!wantAdmin) await Promise.race([notifyNewOrder(order), new Promise((r) => setTimeout(r, 3000))]);
      return res.status(200).json({
        order: {
          id: order.id,
          order_no: order.order_no,
          total: order.total,
          cook_date: order.cook_date,
          fulfillment: order.fulfillment,
          payment_method: order.payment_method,
          status: order.status,
        },
      });
    }

    if (!admin) return res.status(401).json({ error: 'Not logged in' });

    if (req.method === 'GET') {
      const orders = await listOrders({ cookDate: req.query.week || undefined });
      return res.status(200).json({ orders });
    }

    if (req.method === 'PATCH') {
      const { id, ...p } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if ('status' in p && STATUSES.includes(p.status)) patch.status = p.status;
      if ('paid' in p) {
        patch.paid = !!p.paid;
        patch.paid_at = p.paid ? new Date().toISOString() : null;
      }
      if ('payment_method' in p && PAY.includes(p.payment_method)) patch.payment_method = p.payment_method;
      if ('total' in p) patch.total = p.total === '' || p.total == null ? null : Math.max(0, Number(p.total) || 0);
      if ('notes' in p) patch.notes = clean(p.notes, 800);
      if ('cook_date' in p && /^\d{4}-\d{2}-\d{2}$/.test(p.cook_date)) patch.cook_date = p.cook_date;
      if ('route_pos' in p) patch.route_pos = p.route_pos == null ? null : parseInt(p.route_pos, 10);
      if ('fulfillment' in p && ['pickup', 'delivery'].includes(p.fulfillment)) patch.fulfillment = p.fulfillment;
      if ('address' in p) patch.address = clean(p.address, 200);
      if ('zip' in p) patch.zip = clean(p.zip, 10);
      if (!(await getOrder(id))) return res.status(404).json({ error: 'Not found' });
      const order = await updateOrder(id, patch);
      return res.status(200).json({ order });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await deleteOrder(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
