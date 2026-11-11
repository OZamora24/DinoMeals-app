import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPromoList, findPromo, promoDiscount, normCode, promoLabel } from '../lib/promo.js';

test('promo codes: clean, find, discount', () => {
  const list = cleanPromoList([
    { code: ' launch-10 ', type: 'percent', value: 10, active: true },
    { code: 'FIVE', type: 'amount', value: 5 },
    { code: 'OLD', type: 'percent', value: 20, ends: '2026-10-31' },
    { code: 'OFF', value: 15, active: false },
    { code: 'launch10', value: 50 }, // duplicate dropped
    { code: '', value: 5 },
  ]);
  assert.deepEqual(list.map((p) => p.code), ['LAUNCH10', 'FIVE', 'OLD', 'OFF']);
  assert.equal(normCode('launch 10!'), 'LAUNCH10');
  assert.deepEqual(findPromo(list, 'launch10', '2026-11-01'), { code: 'LAUNCH10', type: 'percent', value: 10 });
  assert.equal(findPromo(list, 'OFF', '2026-11-01'), null);
  assert.equal(findPromo(list, 'OLD', '2026-11-01'), null);
  assert.ok(findPromo(list, 'OLD', '2026-10-31'));
  const later = cleanPromoList([{ code: 'SOON', value: 10, starts: '2026-11-01' }]);
  assert.equal(findPromo(later, 'SOON', '2026-10-31'), null);
  assert.ok(findPromo(later, 'SOON', '2026-11-01'));
  assert.equal(findPromo(list, 'NOPE'), null);
  assert.equal(promoDiscount({ type: 'percent', value: 10 }, 123.45), 12.35);
  assert.equal(promoDiscount({ type: 'amount', value: 5 }, 3), 3);
  assert.equal(promoDiscount(null, 100), 0);
  assert.equal(promoLabel({ type: 'amount', value: 5 }), '$5 off');
});

test('promo on a custom quote: typed price is before the discount', async () => {
  const { quotePrice } = await import('../lib/promo.js');
  assert.deepEqual(quotePrice({ type: 'percent', value: 10 }, 150), { subtotal: 150, discount: 15, total: 135 });
  assert.deepEqual(quotePrice({ type: 'amount', value: 5 }, '42.50'), { subtotal: 42.5, discount: 5, total: 37.5 });
  assert.deepEqual(quotePrice({ type: 'amount', value: 50 }, 20), { subtotal: 20, discount: 20, total: 0 });
});

import { promoBlock, adminPromo, findPromo as findPromo2, cleanPromo as cleanPromo2 } from '../lib/promo.js';
test('FIRSTDINO: new customers only, one time per customer', () => {
  const list = [{ code: 'FIRSTDINO', type: 'percent', value: 10, active: true, new_only: true }, { code: 'ONCE5', type: 'amount', value: 5, once: true }];
  const first = findPromo2(list, 'firstdino', '2026-11-11');
  assert.equal(first.new_only, true);
  assert.equal(promoBlock(first, []), null);
  assert.equal(promoBlock(first, [{ status: 'cancelled' }]), null);
  assert.equal(promoBlock(first, [{ status: 'done' }]), 'promo_new_only');
  const once = findPromo2(list, 'ONCE5', '2026-11-11');
  assert.equal(promoBlock(once, [{ status: 'done', promo: { code: 'LAUNCH10' } }]), null);
  assert.equal(promoBlock(once, [{ status: 'done', promo: { code: 'ONCE5' } }]), 'promo_used');
  assert.equal(promoBlock(once, [{ status: 'cancelled', promo: { code: 'ONCE5' } }]), null);
  assert.deepEqual(cleanPromo2({ code: 'x1', value: 10 }).once, false);
});

test('admin can add any saved code to a placed order, even off or expired', () => {
  const list = [{ code: 'OLD10', type: 'percent', value: 10, active: false, ends: '2026-01-01' }];
  assert.equal(findPromo2(list, 'OLD10', '2026-11-11'), null);
  assert.deepEqual(adminPromo(list, 'old10'), { code: 'OLD10', type: 'percent', value: 10 });
  assert.equal(adminPromo(list, 'NOPE'), null);
});
