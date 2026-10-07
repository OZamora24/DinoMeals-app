import { listOrders } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { buildOrdersWorkbook } from '../../lib/exportXlsx';

// Admin: formatted Excel workbook of a cook week's orders (Orders + Summary tabs,
// live totals). Opens in Excel, Google Sheets and Numbers.
export default async function handler(req, res) {
  if (!isValidSession(req)) return res.status(401).end('Not logged in');
  const week = /^\d{4}-\d{2}-\d{2}$/.test(req.query.week || '') ? req.query.week : '';
  const orders = await listOrders({ cookDate: week || undefined });
  let label = 'All orders';
  if (week) {
    const [y, m, d] = week.split('-').map(Number);
    label = 'Cook day ' + new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  const wb = await buildOrdersWorkbook(orders, { week, label });
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="dinomeals-orders-${week || 'all'}.xlsx"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(buf);
}
