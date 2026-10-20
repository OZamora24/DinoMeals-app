// Browser side of customer notifications (promo / reminder messages from /admin -> Messages).
// A customer taps the bell: we ask the phone for permission, subscribe it and tell the server.
// iPhones only allow this for the app added to the Home Screen (iOS 16.4+), and only from a tap.
// Client code only.
const FLAG = 'dino_cust_push';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// iPhone in a normal Safari tab: no push there until the app is on the Home Screen.
export const needsInstall = () => typeof window !== 'undefined' && isIOS() && !isStandalone();

const flagOn = () => { try { return localStorage.getItem(FLAG) === '1'; } catch { return false; } };
const setFlag = (on) => { try { if (on) localStorage.setItem(FLAG, '1'); else localStorage.removeItem(FLAG); } catch {} };

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function call(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, ...j };
}

const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`Timed out: ${what}`)), ms))]);

// 'on' | 'off' | 'blocked' | 'unsupported'
export async function customerPushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted' || !flagOn()) return 'off';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    return reg && (await reg.pushManager.getSubscription()) ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

// Must run from a tap. Never throws: returns { ok, reason }.
export async function enableCustomerPush(lang = 'en') {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'denied' };
    const info = await call('/api/customer-push');
    if (!info.configured || !info.publicKey) return { ok: false, reason: 'server_not_configured' };
    await navigator.serviceWorker.register('/sw.js');
    const reg = await withTimeout(navigator.serviceWorker.ready, 10000, 'the notification helper did not start');
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await withTimeout(
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(info.publicKey) }),
        15000,
        'the push service did not answer'
      );
    }
    const saved = await call('/api/customer-push', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON(), lang }) });
    if (!saved.ok) return { ok: false, reason: 'save_failed' };
    setFlag(true);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'subscribe_failed', detail: String((e && e.message) || e) };
  }
}

// Stops promos for this phone. (We do not delete the browser subscription itself: the kitchen's
// order alerts share it on the owner's phone.)
export async function disableCustomerPush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) await call('/api/customer-push', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) });
  } catch {}
  setFlag(false);
  return { ok: true };
}

// If the phone is subscribed but the server lost it (cleanup of dead phones), quietly add it again.
export async function healCustomerPush(lang = 'en') {
  try {
    if (!pushSupported() || Notification.permission !== 'granted' || !flagOn()) return false;
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg && (await reg.pushManager.getSubscription());
    if (!sub) return false;
    const r = await call('/api/customer-push', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON(), lang }) });
    return !!r.ok;
  } catch {
    return false;
  }
}
