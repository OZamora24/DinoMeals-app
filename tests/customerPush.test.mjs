import test from 'node:test';
import assert from 'node:assert/strict';
import { promoPayload, deliverPromo, cleanSubscription, isAllowedEndpoint } from '../lib/pushPayload.js';
import { cleanPopups, activePopups } from '../lib/popups.js';

const popup = { id: 'm1', title: 'Pick up reminder', body: 'Pickup is Sunday 3–8 PM.\nPlease bring your order # .', title_es: 'Recordatorio', body_es: 'La recogida es el domingo.' };

test('promo payload: language, clipping, opens the home page, tagged as a promo', () => {
  const en = promoPayload(popup, 'en');
  assert.equal(en.title, 'Pick up reminder');
  assert.equal(en.body, 'Pickup is Sunday 3–8 PM. Please bring your order # .'); // line breaks flattened
  assert.equal(en.kind, 'promo');
  assert.equal(en.url, '/');
  assert.equal(en.tag, 'promo-m1');
  const es = promoPayload(popup, 'es');
  assert.equal(es.title, 'Recordatorio');
  assert.equal(es.body, 'La recogida es el domingo.');
  assert.equal(promoPayload({ id: 'x', title: 'Solo EN', body: 'hi' }, 'es').title, 'Solo EN'); // no Spanish text: falls back
  const long = promoPayload({ id: 'y', title: 't'.repeat(200), body: 'b'.repeat(900) }, 'en');
  assert.ok(long.title.length <= 60 && long.body.length <= 180);
  assert.ok(JSON.stringify(long).length < 1000); // far below the ~4KB push limit
  assert.equal(promoPayload({ id: 'z', title: '', body: '' }).title, 'DinoMeals');
});

test('deliverPromo: each phone gets its own language, dead phones are reported, batches work', async () => {
  const subs = [
    { endpoint: 'https://fcm.googleapis.com/a', p256dh: 'k1', auth: 'a1', lang: 'en' },
    { endpoint: 'https://fcm.googleapis.com/b', p256dh: 'k2', auth: 'a2', lang: 'es' },
    { endpoint: 'https://web.push.apple.com/gone', p256dh: 'k3', auth: 'a3', lang: 'en' },
    { endpoint: 'https://web.push.apple.com/flaky', p256dh: 'k4', auth: 'a4', lang: 'en' },
  ];
  const got = [];
  const send = async (sub, body) => {
    if (sub.endpoint.endsWith('/gone')) throw Object.assign(new Error('gone'), { statusCode: 410 });
    if (sub.endpoint.endsWith('/flaky')) throw Object.assign(new Error('boom'), { statusCode: 500 });
    got.push([sub.endpoint, sub.keys, JSON.parse(body).title]);
    return {};
  };
  const r = await deliverPromo(subs, popup, send, 2); // batch of 2 -> two rounds
  assert.equal(r.sent, 2);
  assert.equal(r.failed, 2);
  assert.deepEqual(r.dead, ['https://web.push.apple.com/gone']); // only the 410 is removed; a 500 is kept for next time
  assert.deepEqual(got.map((g) => g[2]).sort(), ['Pick up reminder', 'Recordatorio']);
  assert.deepEqual(got[0][1], { p256dh: 'k1', auth: 'a1' });
  assert.deepEqual(await deliverPromo([], popup, send), { sent: 0, failed: 0, dead: [] });
});

test('customer subscriptions: only real push services, both keys required', () => {
  assert.equal(isAllowedEndpoint('https://fcm.googleapis.com/fcm/send/abc'), true);
  assert.equal(isAllowedEndpoint('https://web.push.apple.com/xyz'), true);
  assert.equal(isAllowedEndpoint('https://evil.example.com/hook'), false);
  assert.equal(isAllowedEndpoint('http://fcm.googleapis.com/x'), false);
  assert.equal(isAllowedEndpoint('https://localhost:3000/x'), false);
  assert.equal(cleanSubscription({ endpoint: 'https://evil.example.com/x', keys: { p256dh: 'a', auth: 'b' } }), null);
  assert.equal(cleanSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a' } }), null);
  assert.ok(cleanSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } }));
});

test('messages keep their notify settings; the public copy never includes them', () => {
  const [p, q] = cleanPopups([
    { id: 'a', title: 'On', notify: true, notified_at: 1700000000000, notified_count: 12 },
    { id: 'b', title: 'Quiet', notify: false },
  ]);
  assert.equal(p.notify, true);
  assert.equal(p.notified_at, 1700000000000);
  assert.equal(p.notified_count, 12);
  assert.equal(q.notify, false);
  assert.equal(q.notified_at, 0);
  assert.equal(cleanPopups([{ title: 'default' }])[0].notify, true); // notifying is the default
  const pub = activePopups([p, q], '2026-10-20');
  assert.ok(pub.every((x) => !('notify' in x) && !('notified_at' in x) && !('notified_count' in x)));
});
