// Server-side Web Push. Subscriptions live in shop settings (push_subs) so no
// database change is needed. Needs VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY /
// VAPID_SUBJECT in the environment; without them everything here is a no-op.
// Only import from pages/api/* or getServerSideProps.
import webpush from 'web-push';
import { getSettings, saveSettings } from './db';
import { orderPayload, isDeadSubscription, cleanSubscription, cleanKey, vapidProblem, MAX_SUBSCRIPTIONS } from './pushPayload';

export const pushProblem = () => vapidProblem(process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
export const pushConfigured = () => !pushProblem();
export const pushPublicKey = () => (pushConfigured() ? cleanKey(process.env.VAPID_PUBLIC_KEY) : null);

let ready = false;
function init() {
  if (ready) return true;
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@dinomeals.vercel.app',
    cleanKey(process.env.VAPID_PUBLIC_KEY),
    cleanKey(process.env.VAPID_PRIVATE_KEY)
  );
  ready = true;
  return true;
}

export async function listSubscriptions() {
  const s = await getSettings({ fresh: true });
  return Array.isArray(s.push_subs) ? s.push_subs : [];
}

export async function addSubscription(raw) {
  const sub = cleanSubscription(raw);
  if (!sub) return { ok: false, error: 'bad_subscription' };
  const subs = (await listSubscriptions()).filter((x) => x.endpoint !== sub.endpoint);
  subs.push(sub);
  await saveSettings({ push_subs: subs.slice(-MAX_SUBSCRIPTIONS) });
  return { ok: true, count: Math.min(subs.length, MAX_SUBSCRIPTIONS) };
}

export async function removeSubscription(endpoint) {
  const subs = await listSubscriptions();
  const next = subs.filter((x) => x.endpoint !== endpoint);
  if (next.length !== subs.length) await saveSettings({ push_subs: next });
  return { ok: true, count: next.length };
}

// Sends one payload to every saved device; drops devices the push service says are gone.
export async function sendToAll(payload) {
  if (!init()) return { sent: 0, failed: 0, skipped: 'not_configured' };
  const subs = await listSubscriptions();
  if (!subs.length) return { sent: 0, failed: 0 };
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(s, body, { TTL: 3600, urgency: 'high', timeout: 4000 }))
  );
  const dead = new Set();
  const errors = [];
  let sent = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') sent += 1;
    else {
      if (isDeadSubscription(r.reason?.statusCode)) dead.add(subs[i].endpoint);
      errors.push({ status: r.reason?.statusCode || null, message: String(r.reason?.body || r.reason?.message || 'unknown').slice(0, 140) });
    }
  });
  if (dead.size) await saveSettings({ push_subs: subs.filter((s) => !dead.has(s.endpoint)) });
  if (errors.length) console.error('push errors', JSON.stringify(errors));
  return { sent, failed: results.length - sent, removed: dead.size, errors };
}

// Never throws: a push problem must not break a customer's order.
export async function notifyNewOrder(order) {
  try {
    return await sendToAll(orderPayload(order));
  } catch (e) {
    console.error('push failed', e?.message || e);
    return { sent: 0, failed: 0, error: true };
  }
}
