import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Runs public/sw.js in a fake service-worker scope so the notification tap logic can be checked.
function load(clientList) {
  const handlers = {};
  const log = { opened: [], focused: [], posted: [], shown: [], closed: 0 };
  const clients = clientList.map((url) => ({ url, focus: async () => { log.focused.push(url); }, postMessage: (m) => log.posted.push([url, m]) }));
  const self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting() {},
    location: { origin: 'https://dinomeals.app' },
    registration: { showNotification: async (title, opts) => { log.shown.push([title, opts]); } },
    clients: { claim: async () => {}, matchAll: async () => clients, openWindow: async (u) => { log.opened.push(u); } },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), { self, URL, JSON, Promise });
  return { handlers, log };
}

const pushEvent = (payload) => { const p = []; return { data: { json: () => payload }, waitUntil: (x) => p.push(x), done: () => Promise.all(p) }; };
const clickEvent = (data) => { const p = []; return { notification: { data, close() {} }, waitUntil: (x) => p.push(x), done: () => Promise.all(p) }; };

test('promo push: shows the notification, carries the message id, does not ping the kitchen chime', async () => {
  const { handlers, log } = load(['https://dinomeals.app/admin']);
  const e = pushEvent({ title: 'Pick up reminder', body: 'Sunday 3-8', id: 'm1', url: '/?promo=m1', kind: 'promo', tag: 'promo-m1' });
  handlers.push(e); await e.done();
  assert.equal(log.shown[0][0], 'Pick up reminder');
  assert.equal(log.shown[0][1].data.promoId, 'm1');
  assert.equal(log.shown[0][1].data.url, '/?promo=m1');
  assert.equal(log.shown[0][1].requireInteraction, false);
  assert.equal(log.posted.length, 0); // the admin tab is NOT told "new order"
});

test('tapping a promo notification with the app already open: bring it forward and tell it which message', async () => {
  const { handlers, log } = load(['https://dinomeals.app/admin', 'https://dinomeals.app/order']);
  const e = clickEvent({ kind: 'promo', url: '/?promo=m1', promoId: 'm1' });
  handlers.notificationclick(e); await e.done();
  assert.deepEqual(log.focused, ['https://dinomeals.app/order']); // never the kitchen page
  assert.equal(JSON.stringify(log.posted), JSON.stringify([['https://dinomeals.app/order', { type: 'dino-promo-open', id: 'm1' }]])); // (objects come from the sandbox)
  assert.deepEqual(log.opened, []);
});

test('tapping a promo notification with the app closed: opens it on /?promo=<id>', async () => {
  const { handlers, log } = load([]);
  const e = clickEvent({ kind: 'promo', url: '/?promo=m1', promoId: 'm1' });
  handlers.notificationclick(e); await e.done();
  assert.deepEqual(log.opened, ['/?promo=m1']);
});

test('kitchen order alerts still behave as before', async () => {
  const { handlers, log } = load(['https://dinomeals.app/admin']);
  const p = pushEvent({ title: 'New order #5', body: 'x', url: '/admin', tag: 'order-5', sticky: true });
  handlers.push(p); await p.done();
  assert.equal(log.posted[0][1].type, 'dino-order');
  const c = clickEvent({ kind: 'order', url: '/admin' });
  handlers.notificationclick(c); await c.done();
  assert.deepEqual(log.focused, ['https://dinomeals.app/admin']);
});
