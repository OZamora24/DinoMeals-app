// Stripe tells us here when a payment finished (set up in Stripe -> Developers -> Webhooks:
// https://dinomeals.app/api/stripe-webhook, events checkout.session.completed +
// checkout.session.async_payment_succeeded). Checks the signature, then marks the order Paid
// (all 4 weeks for a Monthly Plan), texts the customer and pings Juan.
// If the amount paid is less than the order total (the order was changed after paying), it is NOT
// marked paid: the payment is saved on the order and Juan gets a push to sort it out.
import { getOrder, getSettings, ordersByMonthly, updateOrder } from '../../lib/db';
import { verifySignature, webhookSecret, paidFromEvent, stripeRecord, payable } from '../../lib/stripePay';
import { markOrderPaid } from '../../lib/orderTexts';
import { sendToAll } from '../../lib/push';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString('utf8');
}

const money = (n) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
const ping = (title, body) => Promise.race([sendToAll({ title, body, url: '/admin', tag: `paid-${Date.now()}` }).catch(() => null), new Promise((r) => setTimeout(r, 3000))]);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const raw = await rawBody(req);
  if (!verifySignature(raw, req.headers['stripe-signature'], webhookSecret())) return res.status(400).json({ error: 'bad_signature' });
  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ error: 'bad_json' }); }
  const p = paidFromEvent(event);
  if (!p) return res.status(200).json({ ok: true, ignored: event.type });
  try {
    const cur = await getOrder(p.order_id);
    if (!cur) { console.error('stripe: order not found', p.order_id); return res.status(200).json({ ok: true, missing: true }); }
    const rec = stripeRecord(p);
    if (cur.stripe && cur.stripe.session === p.session) return res.status(200).json({ ok: true, dup: true }); // Stripe retried
    const list = cur.monthly && cur.monthly.id ? await ordersByMonthly(cur.monthly.id) : [cur];
    const due = payable(list);
    const settings = await getSettings();
    if (due.ok && p.amount < due.amount) {
      await updateOrder(cur.id, { stripe: { ...rec, paid: false, short: (due.amount - p.amount) / 100 } });
      await ping(`⚠️ #${cur.order_no} paid ${money(p.amount / 100)} online`, `Order total is ${money(due.amount / 100)}. Check the order (it was changed after paying).`);
      return res.status(200).json({ ok: true, short: true });
    }
    const already = !due.ok && due.reason === 'paid';
    await markOrderPaid(cur, settings, { stripe: rec });
    await ping(`💳 #${cur.order_no} paid online`, `${cur.customer_name || 'A customer'} · ${money(p.amount / 100)}${list.length > 1 ? ' · Monthly Plan' : ''}${already ? ' · It was already marked Paid: check for a double payment' : ''}`);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('stripe webhook', e?.message);
    return res.status(500).json({ error: 'server' }); // Stripe retries later
  }
}
