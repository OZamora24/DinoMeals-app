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
