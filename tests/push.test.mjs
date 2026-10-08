import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import webpush from 'web-push';
import { orderPayload, isDeadSubscription, isAllowedEndpoint, cleanSubscription } from '../lib/pushPayload.js';

const order = { order_no: 1042, customer_name: 'Marcus Reyes', meal_count: 8, lb_total: 0, total: 120, fulfillment: 'pickup' };

test('orderPayload: meals order', () => {
  const p = orderPayload(order);
  assert.equal(p.title, 'New order #1042');
  assert.equal(p.body, 'Marcus Reyes · 8 meals · $120 · Pickup');
  assert.equal(p.url, '/admin');
  assert.equal(p.tag, 'order-1042');
  assert.equal(p.sticky, true); // new-order pop-ups stay until tapped
});

test('orderPayload: delivery, by-the-lb, cents', () => {
  const p = orderPayload({ ...order, meal_count: 0, lb_total: 4.5, total: 135.5, fulfillment: 'delivery' });
  assert.equal(p.body, 'Marcus Reyes · 4.5 lb · $135.50 · Delivery');
});

test('orderPayload: meals and lbs together', () => {
  assert.match(orderPayload({ ...order, lb_total: 4 }).body, /8 meals · 4 lb/);
});

test('orderPayload: custom request with no price yet', () => {
  const p = orderPayload({ ...order, meal_count: 0, lb_total: 0, total: null });
  assert.equal(p.body, 'Marcus Reyes · custom request · Pickup');
});

test('orderPayload: missing name', () => {
  assert.match(orderPayload({ ...order, customer_name: '' }).body, /^A customer/);
});

test('dead subscriptions are 404 and 410 only', () => {
  assert.equal(isDeadSubscription(404), true);
  assert.equal(isDeadSubscription(410), true);
  assert.equal(isDeadSubscription(429), false);
  assert.equal(isDeadSubscription(500), false);
  assert.equal(isDeadSubscription(undefined), false);
});

test('only real browser push services are allowed as endpoints', () => {
  for (const ok of [
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ]) assert.equal(isAllowedEndpoint(ok), true, ok);
  for (const bad of [
    'http://fcm.googleapis.com/x', // not https
    'https://evil.example.com/x',
    'https://googleapis.com.evil.com/x',
    'https://notgoogleapis.com/x',
    'https://169.254.169.254/latest/meta-data',
    'file:///etc/passwd',
    'not a url',
    '',
    null,
  ]) assert.equal(isAllowedEndpoint(bad), false, String(bad));
});

test('cleanSubscription keeps only what is needed and rejects bad input', () => {
  const good = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'k', auth: 'a' }, extra: 'drop me' };
  const c = cleanSubscription(good);
  assert.deepEqual(Object.keys(c).sort(), ['added', 'endpoint', 'keys']);
  assert.equal(cleanSubscription({ ...good, keys: {} }), null);
  assert.equal(cleanSubscription({ endpoint: 'https://evil.com/x', keys: good.keys }), null);
  assert.equal(cleanSubscription(null), null);
});

test('web-push can encrypt and address a notification for a real device key', () => {
  // Generate the keys a browser would create for a push subscription.
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const sub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-device',
    keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') },
  };
  const vapid = webpush.generateVAPIDKeys();
  const d = webpush.generateRequestDetails(sub, JSON.stringify(orderPayload(order)), {
    vapidDetails: { subject: 'mailto:test@example.com', publicKey: vapid.publicKey, privateKey: vapid.privateKey },
    TTL: 3600,
    urgency: 'high',
  });
  assert.equal(d.method, 'POST');
  assert.equal(d.endpoint, sub.endpoint);
  assert.equal(d.headers['Content-Encoding'], 'aes128gcm');
  assert.match(d.headers.Authorization, /^vapid t=/);
  assert.equal(d.headers.TTL, 3600);
  assert.equal(d.headers.Urgency, 'high');
  assert.ok(Buffer.isBuffer(d.body) && d.body.length > 0);
  assert.ok(!d.body.toString('utf8').includes('Marcus')); // payload is encrypted, not plain text
});

// ---------- VAPID key validation ----------
import { cleanKey, vapidProblem } from '../lib/pushPayload.js';

test('vapidProblem accepts a real key pair, with stray quotes/spaces/prefix', () => {
  const k = webpush.generateVAPIDKeys();
  assert.equal(vapidProblem(k.publicKey, k.privateKey), null);
  assert.equal(vapidProblem(` "${k.publicKey}" \n`, `VAPID_PRIVATE_KEY=${k.privateKey}`), null);
  assert.equal(cleanKey(`  'VAPID_PUBLIC_KEY=${k.publicKey}'  `), k.publicKey);
});

test('vapidProblem catches the common paste mistakes', () => {
  const k = webpush.generateVAPIDKeys();
  assert.equal(vapidProblem('', ''), 'missing');
  assert.equal(vapidProblem(undefined, undefined), 'missing');
  // a description pasted instead of the key (this really happened)
  assert.equal(vapidProblem('the long string after VAPID_PUBLIC_KEY= in the file', k.privateKey), 'bad_public_key');
  assert.equal(vapidProblem(k.publicKey, 'the string after VAPID_PRIVATE_KEY='), 'bad_private_key');
  assert.equal(vapidProblem(k.publicKey.slice(0, 80), k.privateKey), 'bad_public_key'); // truncated
  assert.equal(vapidProblem(k.privateKey, k.publicKey), 'bad_public_key'); // swapped
});
