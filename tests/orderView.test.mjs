import test from 'node:test';
import assert from 'node:assert/strict';
import { publicOrder, trackOf } from '../lib/orderView.js';
import { buildMessage } from '../lib/sms.js';

const base = {
  id: 'o1', order_no: 1042, view_token: 'ab12cd34ef56', customer_name: 'Maria Lopez', phone: '(909) 555-0123',
  phone_digits: '9095550123', address: '412 W Base Line Rd', zip: '92376', notes: 'gate code 1234', allergy_notes: 'x',
  email: 'm@x.com', lang: 'es', meal_count: 12, lb_total: 0, subtotal: 168, delivery_fee: 0, total: 168,
  cook_date: '2026-10-18', fulfillment: 'pickup', payment_method: 'zelle', paid: false, status: 'new',
  items: [{ type: 'meal', protein: 'tritip', carb: 'whiterice', veg: 'broccoli', count: 12, unit: 14, total: 168 }],
};

test('the public order view never includes name, phone, address, email or notes', () => {
  const v = publicOrder(base);
  const json = JSON.stringify(v);
  for (const secret of ['Maria', '555-0123', '9095550123', 'Base Line', '92376', 'gate code', 'm@x.com', '"o1"']) {
    assert.ok(!json.includes(secret), `leaked ${secret}`);
  }
  assert.equal(v.token, 'ab12cd34ef56');
  assert.equal(v.items[0].count, 12);
  assert.equal(v.total, 168);
});

test('order status tracker', () => {
  assert.equal(trackOf(base, '2026-10-15').key, 'unpaid');
  assert.equal(trackOf({ ...base, total: null }, '2026-10-15').key, 'quote');
  assert.deepEqual(trackOf({ ...base, paid: true }, '2026-10-15'), { key: 'paid', done: 2, now: -1 });
  assert.deepEqual(trackOf({ ...base, paid: true }, '2026-10-18'), { key: 'cooking', done: 2, now: 2 });
  assert.equal(trackOf({ ...base, paid: true, status: 'cooking' }, '2026-10-15').key, 'cooking');
  assert.equal(trackOf({ ...base, paid: true, status: 'ready' }).done, 4);
  assert.equal(trackOf({ ...base, status: 'done' }).key, 'picked_up');
  assert.equal(trackOf({ ...base, status: 'done', fulfillment: 'delivery' }).key, 'delivered');
  assert.equal(trackOf({ ...base, status: 'cancelled' }).key, 'cancelled');
});

test('confirmation and payment texts link to the private order page', () => {
  const s = { zelle_info: '(909) 436-6621' };
  const c = buildMessage('confirm', { ...base, lang: 'en' }, s);
  assert.match(c, /Your order: dinomeals\.app\/o\/ab12cd34ef56 Reply STOP/);
  assert.match(buildMessage('confirm', base, s), /Tu orden: dinomeals\.app\/o\/ab12cd34ef56/);
  assert.match(buildMessage('paid', { ...base, lang: 'en', paid: true }, s), /dinomeals\.app\/o\/ab12cd34ef56/);
  assert.doesNotMatch(buildMessage('ready', { ...base, lang: 'en' }, s), /\/o\//);
  assert.doesNotMatch(buildMessage('confirm', { ...base, lang: 'en', view_token: undefined }, s), /\/o\/|  /);
  for (const m of [c, buildMessage('confirm', base, s)]) assert.ok(m.length <= 360, `too long (${m.length})`);
});
