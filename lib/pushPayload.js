// Pure helpers for push notifications (no network, no env) so they can be unit-tested.

const money = (n) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;

// What the owner sees on the lock screen / desktop pop-up for a new order.
export function orderPayload(order) {
  const parts = [];
  if (order.meal_count > 0) parts.push(`${order.meal_count} meals`);
  if (Number(order.lb_total) > 0) parts.push(`${Number(order.lb_total)} lb`);
  if (!parts.length) parts.push('custom request');
  if (order.total != null) parts.push(money(order.total));
  parts.push(order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup');
  return {
    title: `New order #${order.order_no}`,
    body: `${order.customer_name || 'A customer'} · ${parts.join(' · ')}`,
    url: '/admin',
    tag: `order-${order.order_no}`,
    sticky: true, // stay on screen until tapped (desktop) so an order is never missed
  };
}

// A push service answers 404/410 when the subscription is gone for good
// (app uninstalled, permission revoked). Those get removed from the list.
export const isDeadSubscription = (statusCode) => statusCode === 404 || statusCode === 410;

// Only accept subscriptions from the real browser push services, so an
// admin-supplied endpoint can never make the server call an arbitrary URL.
const PUSH_HOSTS = ['googleapis.com', 'mozilla.com', 'push.apple.com', 'windows.com'];
export function isAllowedEndpoint(endpoint) {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:') return false;
    return PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// Returns a clean subscription object or null.
export function cleanSubscription(sub) {
  if (!sub || typeof sub.endpoint !== 'string' || !isAllowedEndpoint(sub.endpoint)) return null;
  const { p256dh, auth } = sub.keys || {};
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth) return null;
  return { endpoint: sub.endpoint, keys: { p256dh, auth }, added: new Date().toISOString() };
}

export const MAX_SUBSCRIPTIONS = 20;

// VAPID keys pasted into Vercel often pick up quotes, spaces or a "NAME=" prefix.
export const cleanKey = (v) => {
  const unquote = (x) => x.trim().replace(/^["']+|["']+$/g, '').trim();
  return unquote(unquote(String(v || '')).replace(/^VAPID_(PUBLIC|PRIVATE)_KEY\s*=\s*/, ''));
};

// A public VAPID key is 65 bytes (87 base64url chars); the private key is 32 bytes (43 chars).
// Returns null when both are fine, else what is wrong.
export function vapidProblem(pub, priv) {
  const p = cleanKey(pub);
  const k = cleanKey(priv);
  if (!p && !k) return 'missing';
  if (!/^[A-Za-z0-9_-]{87}$/.test(p)) return 'bad_public_key';
  if (!/^[A-Za-z0-9_-]{43}$/.test(k)) return 'bad_private_key';
  return null;
}

// A promo / reminder pop-up written in /admin -> Messages, as the customer sees it on their lock screen.
// Spanish subscribers get the Spanish text when the message has one.
const clipTxt = (v, n) => {
  const t = String(v || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
export function promoPayload(popup, lang = 'en') {
  const es = lang === 'es';
  const title = (es && popup.title_es) || popup.title || 'DinoMeals';
  const body = (es && popup.body_es) || popup.body || '';
  return { title: clipTxt(title, 60), body: clipTxt(body, 180), id: popup.id, url: `/?promo=${encodeURIComponent(popup.id)}`, tag: `promo-${popup.id}`, kind: 'promo' };
}

// Sends a promo to a list of subscribers in small batches. `send(sub, body)` does one delivery
// (web-push in production, a fake in tests). Returns counts plus the endpoints that are gone.
export async function deliverPromo(subs, popup, send, batch = 40) {
  const bodies = { en: JSON.stringify(promoPayload(popup, 'en')), es: JSON.stringify(promoPayload(popup, 'es')) };
  const dead = [];
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < subs.length; i += batch) {
    const chunk = subs.slice(i, i + batch);
    const results = await Promise.allSettled(
      chunk.map((s) => send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, bodies[s.lang === 'es' ? 'es' : 'en']))
    );
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') sent += 1;
      else {
        failed += 1;
        if (isDeadSubscription(r.reason?.statusCode)) dead.push(chunk[j].endpoint);
      }
    });
  }
  return { sent, failed, dead };
}
