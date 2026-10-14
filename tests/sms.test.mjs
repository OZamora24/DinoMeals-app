import test from 'node:test';
import assert from 'node:assert/strict';
import { smsStatus, shouldSend, buildMessage, sendOrderText } from '../lib/sms.js';

const ON = { SMS_ENABLED: 'true', TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 'tok', TWILIO_MESSAGING_SERVICE_SID: 'MG1' };
const order = {
  id: 'o1', order_no: 1042, customer_name: 'Maria Lopez', phone_digits: '9095550123', lang: 'en',
  meal_count: 12, lb_total: 0, total: 168, cook_date: '2026-10-18', fulfillment: 'pickup',
  payment_method: 'zelle', paid: false, status: 'new', sms_opt_in: true, sms_sent: {},
};

test('texts stay OFF until SMS_ENABLED=true and Twilio keys are set', () => {
  assert.equal(smsStatus({}).live, false);
  assert.equal(smsStatus({ ...ON, SMS_ENABLED: 'false' }).live, false);
  assert.equal(smsStatus({ SMS_ENABLED: 'true' }).live, false);
  assert.equal(smsStatus(ON).live, true);
  assert.equal(shouldSend('confirm', order, {}), false);
  assert.equal(shouldSend('confirm', order, ON), true);
});

test('only opted-in, not-yet-sent, not-cancelled orders get a text', () => {
  assert.equal(shouldSend('confirm', { ...order, sms_opt_in: false }, ON), false);
  assert.equal(shouldSend('paid', { ...order, sms_sent: { paid: 'x' } }, ON), false);
  assert.equal(shouldSend('ready', { ...order, status: 'cancelled' }, ON), false);
  assert.equal(shouldSend('promo', order, ON), false);
});

test('the three messages name the brand and carry STOP/HELP', () => {
  const s = { zelle_info: '(909) 436-6621', pickup_address: '123 Main St, Rialto' };
  const c = buildMessage('confirm', order, s);
  const p = buildMessage('paid', { ...order, paid: true }, s);
  const r = buildMessage('ready', order, s);
  for (const m of [c, p, r]) {
    assert.match(m, /^DinoMeals: /);
    assert.match(m, /STOP/);
    assert.ok(m.length <= 320, `too long (${m.length}): ${m}`);
  }
  assert.match(c, /#1042: 12 meals, total \$168/);
  assert.match(c, /Zelle to \(909\) 436-6621/);
  assert.match(r, /ready for pickup! Pickup at 123 Main St/);
  assert.match(buildMessage('ready', { ...order, fulfillment: 'delivery' }, s), /out for delivery Mon, Oct 19/);
  assert.match(buildMessage('confirm', { ...order, total: null }, s), /custom request #1042/);
  assert.match(buildMessage('confirm', { ...order, lang: 'es' }, s), /Recibimos tu orden #1042: 12 comidas/);
});

test('sendOrderText posts to Twilio and returns the sent map; errors never throw', async () => {
  let call;
  const ok = async (url, init) => { call = { url, init }; return { ok: true, text: async () => '' }; };
  const sent = await sendOrderText('confirm', order, {}, { env: ON, fetchImpl: ok });
  assert.ok(sent.confirm);
  assert.match(call.url, /Accounts\/AC1\/Messages\.json$/);
  assert.match(call.init.body, /To=%2B19095550123/);
  assert.match(call.init.body, /MessagingServiceSid=MG1/);
  assert.equal(await sendOrderText('confirm', order, {}, { env: {}, fetchImpl: ok }), null);
  const bad = async () => ({ ok: false, status: 400, text: async () => 'nope' });
  assert.equal(await sendOrderText('confirm', order, {}, { env: ON, fetchImpl: bad }), null);
  const boom = async () => { throw new Error('net'); };
  assert.equal(await sendOrderText('confirm', order, {}, { env: ON, fetchImpl: boom }), null);
});
