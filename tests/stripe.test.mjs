import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { stripeStatus, cardOnline, payable, checkoutFields, formBody, createCheckout, verifySignature, paidFromEvent, stripeRecord, dashboardLink, payUrl } from '../lib/stripePay.js';
import { buildMessage } from '../lib/sms.js';

const ENV = { STRIPE_SECRET_KEY: 'sk_test_abcdefghijklmnop', STRIPE_WEBHOOK_SECRET: 'whsec_abcdefghijklmnop' };
const order = (x = {}) => ({ id: 'o1', order_no: 1093, view_token: 'tok123', lang: 'en', status: 'new', paid: false, total: 112, ...x });

test('status + on/off: needs both keys AND the switch', () => {
  assert.deepEqual(stripeStatus(ENV), { ready: true, key: true, webhook: true, mode: 'test' });
  assert.equal(stripeStatus({ ...ENV, STRIPE_SECRET_KEY: 'sk_live_abcdefghijklmnop' }).mode, 'live');
  assert.equal(stripeStatus({ STRIPE_SECRET_KEY: 'pk_test_abcdefghijklmnop' }).ready, false); // publishable key by mistake
  assert.equal(cardOnline({ stripe_on: true }, ENV), true);
  assert.equal(cardOnline({ stripe_on: false }, ENV), false);
  assert.equal(cardOnline({ stripe_on: true }, {}), false);
});

test('payable: current total, never paid / cancelled / unpriced; monthly = all unpaid weeks', () => {
  assert.deepEqual(payable(order()), { ok: true, amount: 11200 });
  assert.equal(payable(order({ paid: true })).reason, 'paid');
  assert.equal(payable(order({ status: 'cancelled' })).reason, 'cancelled');
  assert.equal(payable(order({ total: null })).reason, 'quote');
  assert.equal(payable([]).reason, 'not_found');
  const plan = [1, 2, 3, 4].map((w) => order({ id: `w${w}`, total: 100.5, monthly: { id: 'm1', week: w } }));
  assert.deepEqual(payable(plan), { ok: true, amount: 40200 });
});

test('checkout fields: amount from the server, links back to the order, metadata', () => {
  const f = checkoutFields(order({ monthly: { id: 'm1', week: 1 } }), { amount: 11200, weeks: 4 });
  assert.equal(f['line_items[0][price_data][unit_amount]'], '11200');
  assert.equal(f.success_url, 'https://dinomeals.app/o/tok123?paid=1');
  assert.equal(f.cancel_url, 'https://dinomeals.app/o/tok123');
  assert.equal(f['metadata[order_id]'], 'o1');
  assert.equal(f['metadata[monthly_id]'], 'm1');
  assert.match(f['line_items[0][price_data][product_data][name]'], /Monthly Plan #1093 \(4 weeks\)/);
  assert.equal(checkoutFields(order({ lang: 'es' }), { amount: 1 }).locale, 'es');
  assert.ok(!formBody(checkoutFields(order(), { amount: 1 })).includes('monthly_id')); // blank fields left out
});

test('createCheckout posts to Stripe with the secret key', async () => {
  let seen;
  const fetchImpl = async (url, opt) => { seen = { url, opt }; return { ok: true, status: 200, json: async () => ({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' }) }; };
  const r = await createCheckout({ mode: 'payment' }, { env: ENV, fetchImpl });
  assert.equal(r.url, 'https://checkout.stripe.com/c/pay/cs_1');
  assert.equal(seen.url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.equal(seen.opt.headers.Authorization, `Bearer ${ENV.STRIPE_SECRET_KEY}`);
  await assert.rejects(createCheckout({}, { env: ENV, fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'bad' } }) }) }), /stripe 400: bad/);
});

test('webhook signature', () => {
  const raw = '{"id":"evt_1"}';
  const secret = ENV.STRIPE_WEBHOOK_SECRET;
  const t = 1800000000;
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  assert.equal(verifySignature(raw, `t=${t},v1=${sig}`, secret, { now: t * 1000 }), true);
  assert.equal(verifySignature(raw + ' ', `t=${t},v1=${sig}`, secret, { now: t * 1000 }), false); // body changed
  assert.equal(verifySignature(raw, `t=${t},v1=${sig}`, 'whsec_other', { now: t * 1000 }), false);
  assert.equal(verifySignature(raw, `t=${t},v1=${sig}`, secret, { now: (t + 600) * 1000 }), false); // too old
  assert.equal(verifySignature(raw, '', secret), false);
});

test('paid event -> record; unpaid / other events ignored', () => {
  const ev = { type: 'checkout.session.completed', data: { object: { id: 'cs_1', payment_status: 'paid', amount_total: 11200, payment_intent: 'pi_1', livemode: false, metadata: { order_id: 'o1', monthly_id: '' } } } };
  const p = paidFromEvent(ev);
  assert.deepEqual(p, { order_id: 'o1', monthly_id: '', amount: 11200, session: 'cs_1', payment_intent: 'pi_1', livemode: false });
  assert.equal(paidFromEvent({ ...ev, data: { object: { ...ev.data.object, payment_status: 'unpaid' } } }), null);
  assert.equal(paidFromEvent({ ...ev, type: 'charge.refunded' }), null);
  const rec = stripeRecord(p, 'T');
  assert.deepEqual(rec, { paid: true, amount: 112, session: 'cs_1', payment_intent: 'pi_1', livemode: false, at: 'T' });
  assert.equal(dashboardLink(rec), 'https://dashboard.stripe.com/test/payments/pi_1');
  assert.equal(payUrl('tok123'), 'https://dinomeals.app/pay/tok123');
});

test('texts use the Pay now link only when Stripe is on', () => {
  const o = order({ payment_method: 'card', customer_name: 'Maria Lopez', meal_count: 8, cook_date: '2026-11-15', fulfillment: 'pickup' });
  const old = { ...process.env };
  Object.assign(process.env, ENV);
  try {
    assert.match(buildMessage('confirm', o, { stripe_on: true }), /Apple Pay or Google Pay: https:\/\/dinomeals\.app\/pay\/tok123/);
    assert.doesNotMatch(buildMessage('confirm', o, { stripe_on: false, card_link: 'https://square.link/x' }), /\/pay\//);
  } finally { process.env = old; }
});
