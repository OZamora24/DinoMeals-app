// Pay online with Stripe: card, Apple Pay and Google Pay (Juan, Nov 2026).
//  - Customer picks "Card" at checkout -> the confirmation screen, the order page and the texts show
//    "Pay now" -> dinomeals.app/pay/<code> makes a Stripe Checkout page for the order's CURRENT total
//    (never an amount from the browser) and sends them there. Stripe's page shows Apple Pay on
//    iPhone / Safari and Google Pay on Android / Chrome by itself.
//  - When Stripe says it's paid (webhook, /api/stripe-webhook) the order is marked Paid, the customer
//    gets the usual "payment received" text and Juan gets a push. A Monthly Plan is paid as one
//    (all 4 weeks together).
//  - Refunds are done in the Stripe dashboard.
//  - Off until the keys are in Vercel (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET) AND Juan turns it on
//    in Admin -> Menu & settings. Until then the old card link (if any) is used.
// No Stripe package: two small HTTPS calls + the webhook signature check below.
import crypto from 'crypto';

export const STRIPE_API = 'https://api.stripe.com/v1';
export const SIG_TOLERANCE_S = 300;

const clean = (v) => String(v || '').trim();
export const stripeKey = (env = process.env) => clean(env.STRIPE_SECRET_KEY);
export const webhookSecret = (env = process.env) => clean(env.STRIPE_WEBHOOK_SECRET);

// What Admin shows: are the keys in, test or live mode. Never returns the keys.
export function stripeStatus(env = process.env) {
  const key = stripeKey(env);
  const hook = webhookSecret(env);
  const keyOk = /^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/.test(key);
  const hookOk = /^whsec_[A-Za-z0-9+/=]{10,}$/.test(hook);
  return {
    ready: keyOk && hookOk,
    key: keyOk,
    webhook: hookOk,
    mode: keyOk ? (/_live_/.test(key) ? 'live' : 'test') : null,
  };
}

// Customers pay online only when the keys are in AND Juan switched it on.
export const cardOnline = (s = {}, env = process.env) => !!(s && s.stripe_on) && stripeStatus(env).ready;

export const cents = (n) => Math.round((Number(n) || 0) * 100);
export const payUrl = (token, base = 'https://dinomeals.app') => `${base}/pay/${token}`;

// Can this order be paid online right now? orders = the order, or all 4 weeks of a Monthly Plan.
// Returns { ok, amount (cents), reason }.
export function payable(orders = []) {
  const list = (Array.isArray(orders) ? orders : [orders]).filter(Boolean);
  if (!list.length) return { ok: false, reason: 'not_found' };
  const live = list.filter((o) => o.status !== 'cancelled');
  if (!live.length) return { ok: false, reason: 'cancelled' };
  if (live.every((o) => o.paid)) return { ok: false, reason: 'paid' };
  if (live.some((o) => o.total == null)) return { ok: false, reason: 'quote' }; // custom order not priced yet
  const amount = live.filter((o) => !o.paid).reduce((a, o) => a + cents(o.total), 0);
  if (amount < 50) return { ok: false, reason: 'too_small' }; // Stripe's minimum is $0.50
  return { ok: true, amount };
}

// Fields for POST /v1/checkout/sessions. order = the order (week 1 for a Monthly Plan).
export function checkoutFields(order, { amount, base = 'https://dinomeals.app', weeks = 1 } = {}) {
  const es = order.lang === 'es';
  const name = weeks > 1
    ? `DinoMeals · ${es ? 'Plan mensual' : 'Monthly Plan'} #${order.order_no} (${weeks} ${es ? 'semanas' : 'weeks'})`
    : `DinoMeals · ${es ? 'Orden' : 'Order'} #${order.order_no}`;
  const meta = { order_id: order.id, order_no: String(order.order_no), monthly_id: (order.monthly && order.monthly.id) || '' };
  const f = {
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][product_data][name]': name,
    success_url: `${base}/o/${order.view_token}?paid=1`,
    cancel_url: `${base}/o/${order.view_token}`,
    client_reference_id: order.id,
    locale: es ? 'es' : 'en',
    'payment_intent_data[description]': name,
  };
  for (const [k, v] of Object.entries(meta)) {
    f[`metadata[${k}]`] = v;
    f[`payment_intent_data[metadata][${k}]`] = v;
  }
  return f;
}

export const formBody = (fields) => new URLSearchParams(Object.entries(fields).filter(([, v]) => v !== '' && v != null)).toString();

// Makes the Stripe Checkout page. Returns { url, id } or throws.
export async function createCheckout(fields, { env = process.env, fetchImpl = fetch } = {}) {
  const r = await fetchImpl(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripeKey(env)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody(fields),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(`stripe ${r.status}: ${(j.error && j.error.message) || 'no url'}`);
  return { url: j.url, id: j.id };
}

// Checks the Stripe-Signature header ("t=...,v1=...") against the raw body. Returns true/false.
export function verifySignature(raw, header, secret, { now = Date.now(), tolerance = SIG_TOLERANCE_S } = {}) {
  if (!raw || !header || !secret) return false;
  const parts = String(header).split(',').map((p) => p.split('='));
  const t = Number((parts.find(([k]) => k === 't') || [])[1]);
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(now / 1000 - t) > tolerance) return false;
  const want = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return sigs.some((s) => s && s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want)));
}

// From a webhook event: what was paid, or null when it's not a finished payment.
export function paidFromEvent(event) {
  if (!event || !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return null;
  const s = event.data && event.data.object;
  if (!s || s.payment_status !== 'paid') return null;
  const m = s.metadata || {};
  if (!m.order_id) return null;
  return {
    order_id: m.order_id,
    monthly_id: m.monthly_id || '',
    amount: Number(s.amount_total) || 0,
    session: s.id,
    payment_intent: typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent && s.payment_intent.id) || '',
    livemode: !!s.livemode,
  };
}

// What's saved on the order (orders.stripe).
export const stripeRecord = (p, at = new Date().toISOString()) => ({ paid: true, amount: p.amount / 100, session: p.session, payment_intent: p.payment_intent, livemode: p.livemode, at });

// Link for Juan in Admin.
export const dashboardLink = (rec) => (rec && rec.payment_intent ? `https://dashboard.stripe.com/${rec.livemode ? '' : 'test/'}payments/${rec.payment_intent}` : '');
