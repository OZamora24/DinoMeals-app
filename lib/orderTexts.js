// Order-status texts + "mark paid", shared by Admin (pages/api/orders) and the Stripe webhook.
import { updateOrder, ordersByPhone, ordersByMonthly } from './db';
import { sendOrderText, progressLine } from './sms';
import { loyaltyState, loyaltyConfig, qualifies } from './loyalty';
import { dateKey, laNow } from './menu';

// Sends one order-status text (if the customer opted in and texts are switched on)
// and records it on the order so it never sends twice. Capped at 5s; never throws.
export async function textCustomer(kind, order, settings) {
  try {
    const extra = kind === 'paid' ? { line: await rewardsLine(order, settings) } : {};
    const sent = await Promise.race([sendOrderText(kind, order, settings, { extra }), new Promise((r) => setTimeout(() => r(null), 5500))]);
    if (sent) await updateOrder(order.id, { sms_sent: sent });
  } catch (e) {
    console.error('textCustomer', kind, e?.message);
  }
}

// "⭐ Rewards: 3 of 5…" / "🎉 You unlocked…" for the payment-received text. Only when this order
// counts toward the program; any error just leaves the line off.
export async function rewardsLine(order, settings) {
  try {
    if (!order.sms_opt_in || !qualifies(order, loyaltyConfig(settings))) return '';
    const own = await ordersByPhone(order.phone_digits, 500);
    return progressLine(loyaltyState(own, dateKey(laNow()), settings, order.phone_digits), order, order.lang === 'es' ? 'es' : 'en');
  } catch (e) {
    console.error('rewardsLine', e?.message);
    return '';
  }
}

// Marks an order paid (all 4 weeks for a Monthly Plan) and sends the one "payment received" text.
// extra = more fields to save (e.g. the Stripe record). Returns the updated order.
export async function markOrderPaid(cur, settings, extra = {}) {
  const paid_at = new Date().toISOString();
  const wasPaid = !!cur.paid;
  const order = await updateOrder(cur.id, wasPaid ? extra : { paid: true, paid_at, ...extra });
  let week1 = cur.monthly ? null : order;
  if (cur.monthly && cur.monthly.id) {
    try {
      for (const sib of await ordersByMonthly(cur.monthly.id)) {
        const s = sib.id === cur.id ? order : sib.paid ? sib : await updateOrder(sib.id, { paid: true, paid_at, ...extra });
        if (s.monthly && s.monthly.week === 1) week1 = s;
      }
    } catch (e) { console.error('monthly paid', e?.message); }
  }
  if (!wasPaid && week1) await textCustomer('paid', week1, settings);
  return order;
}
