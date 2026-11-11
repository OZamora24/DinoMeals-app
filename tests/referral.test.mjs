import test from 'node:test';
import assert from 'node:assert/strict';
import { referralCredits, allDiscounts, isNewCustomer, referralsThisMonth, refKey, normRef } from '../lib/referral.js';

const f = (i, extra = {}) => ({ id: `f${i}`, order_no: 3000 + i, customer_name: `Friend${i} X`, cook_date: '2026-11-15', paid: true, status: 'new', meal_count: 8, items: [{}], total: 112, referral: { by: '9095550142', pct: 10 }, created_at: '2026-11-10T10:00:00Z', ...extra });

test('credits: earned only when paid and big enough, max 2 per order, used/expired', () => {
  const friends = [f(1), f(2), f(3), f(4, { paid: false }), f(5, { meal_count: 4 })];
  const r = referralCredits(friends, [], '2026-11-20');
  assert.equal(r.available, 3);
  assert.deepEqual(r.use, ['f1', 'f2']);
  assert.equal(r.pct, 10);
  assert.equal(r.credits.filter((c) => c.status === 'pending').length, 2);
  const used = referralCredits(friends, [{ order_no: 9, status: 'new', ref_credit: { ids: ['f1', 'f2'] } }], '2026-11-20');
  assert.deepEqual(used.use, ['f3']);
  assert.equal(used.pct, 5);
  assert.equal(referralCredits(friends, [], '2027-02-01').available, 0); // 60 days later
});

test('new customer, monthly count, codes', () => {
  assert.ok(isNewCustomer([]));
  assert.ok(isNewCustomer([{ status: 'cancelled' }]));
  assert.equal(isNewCustomer([{ status: 'done' }]), false);
  assert.equal(referralsThisMonth([f(1), f(2), f(3, { status: 'cancelled' }), f(4, { created_at: '2026-10-30T10:00:00Z' })], '2026-11-20T00:00:00Z'), 2);
  assert.equal(normRef('marcus-7q2k9'), 'MARCUS7Q2K9');
  assert.equal(refKey('Marcus-7Q2K9'), '7Q2K9');
});

test('discounts: ONE 20% max for everything; credits that do not fit wait (Juan, Nov 11)', () => {
  // LAUNCH10 + 20% loyalty -> already at 20%: no credits used, they wait
  assert.deepEqual(allDiscounts(100, { promoDisc: 10, reward: { kind: 'percent', value: 20 }, creditPct: 10 }), { promo: 10, reward: 10, referral: 0, credit: 0, creditPct: 0, total: 20 });
  // 10% loyalty + 2 credits (10%) -> fits exactly: 20%
  assert.deepEqual(allDiscounts(100, { reward: { kind: 'percent', value: 10 }, creditPct: 10 }), { promo: 0, reward: 10, referral: 0, credit: 10, creditPct: 10, total: 20 });
  // 5% trainer + 2 credits -> room 15%: only 2 credits fit = 10% (whole credits only)
  assert.equal(allDiscounts(100, { promoDisc: 5, creditPct: 10 }).creditPct, 10);
  // 15% loyalty-ish + 2 credits -> room 5%: 1 credit used
  assert.deepEqual(allDiscounts(100, { promoDisc: 15, creditPct: 10 }), { promo: 15, reward: 0, referral: 0, credit: 5, creditPct: 5, total: 20 });
  // new customer: 10% trainer code + 10% friend's link = 20%
  assert.equal(allDiscounts(112, { promoDisc: 11.2, refPct: 10 }).total, 22.4);
  // a 15% promo + friend's 10% -> stops at 20%
  assert.equal(allDiscounts(100, { promoDisc: 15, refPct: 10 }).total, 20);
  // quote priced later keeps the credits for then
  assert.equal(allDiscounts(0, { creditPct: 10 }).creditPct, 10);
  assert.equal(allDiscounts(10, { promoDisc: 10, refPct: 50 }).total, 10);
});
