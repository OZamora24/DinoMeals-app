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
