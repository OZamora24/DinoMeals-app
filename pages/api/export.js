import { listOrders } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { lineLabel } from '../../lib/menu';

// Admin: CSV of a cook week's orders (opens in Excel / Google Sheets).
export default async function handler(req, res) {
  if (!isValidSession(req)) return res.status(401).end('Not logged in');
  const week = req.query.week;
  const orders = await listOrders({ cookDate: week || undefined });
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Order #', 'Cook date', 'Placed', 'Name', 'Phone', 'Email', 'Items', 'Meals', 'Lbs', 'Total', 'Pickup/Delivery', 'Address', 'ZIP', 'Payment', 'Paid', 'Status', 'Diet', 'Allergy notes', 'Notes', 'Custom request', 'Source'];
  const rows = orders.map((o) => [
    o.order_no, o.cook_date, o.created_at, o.customer_name, o.phone, o.email,
    (o.items || []).map((l) => (l.type === 'meal' ? `${l.count}x ${lineLabel(l)}` : `${l.lbs} lb ${lineLabel(l)}`)).join('; '),
    o.meal_count, o.lb_total, o.total, o.fulfillment, o.address, o.zip, o.payment_method, o.paid ? 'yes' : 'no',
    o.status, (o.diet || []).join(' '), o.allergy_notes, o.notes, o.custom_request, o.source,
  ]);
  const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="dinomeals-${week || 'all'}.csv"`);
  return res.status(200).send('﻿' + csv);
}
