import { getOrder, getSettings, listOrders } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { buildLabelsDocx } from '../../lib/labelsDocx';
import { labelCount } from '../../lib/labelSpots';

// Admin: printable meal labels (Word .docx, 3" x 2" PLS504 sheets).
//   ?id=<order id>        one order
//   ?week=YYYY-MM-DD      every active order of that cook day, back to back
//   &start=1..10          first empty spot on the sheet (skips used ones)
export default async function handler(req, res) {
  if (!isValidSession(req)) return res.status(401).end('Not logged in');
  const settings = await getSettings();
  const start = req.query.start;
  let orders = [];
  let name = '';
  if (req.query.id) {
    const order = await getOrder(String(req.query.id));
    if (!order) return res.status(404).end('Order not found');
    orders = [order];
    const who = String(order.customer_name || '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'customer';
    name = `DinoMeals-Labels-${order.order_no || ''}-${who}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.week || '')) {
    orders = (await listOrders({ cookDate: req.query.week }))
      .filter((o) => o.status !== 'cancelled' && labelCount(o) > 0)
      .sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
    if (!orders.length) return res.status(404).end('No orders with meals this cook day');
    name = `DinoMeals-Labels-${req.query.week}-all`;
  } else return res.status(400).end('Missing order');
  const { buffer } = await buildLabelsDocx(orders, settings, { start });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.docx"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(buffer);
}
