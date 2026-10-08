// Browser-side helpers for new-order alerts: chime, permission, push subscription.
// Only import from client code (pages/admin.js, components/AlertsButton.js).

const SOUND_KEY = 'dinoAlertSound';

// ---------- sound ----------
let audioCtx = null;
export const soundEnabled = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
};
export const setSoundEnabled = (on) => {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {}
};

// Two-note "ding-dong" made with the Web Audio API (no audio file needed).
// Browsers only allow sound after the person has tapped something on the page,
// which the "Turn on alerts" button counts as.
export function playChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    [[880, 0], [1318.5, 0.18]].forEach(([freq, delay]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + delay);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.55);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + 0.6);
    });
  } catch {}
}

// ---------- capability / state ----------
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

let pushActive = false;
export const isPushActive = () => pushActive;

export async function getAlertState() {
  const hasNotif = typeof window !== 'undefined' && 'Notification' in window;
  const hasPush = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  // iPhones only allow notifications for a site added to the Home Screen.
  const iosNeedsInstall = typeof navigator !== 'undefined' && isIOS() && !isStandalone();
  let subscribed = false;
  if (hasPush) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      subscribed = !!(reg && (await reg.pushManager.getSubscription()));
    } catch {}
  }
  pushActive = subscribed;
  return {
    hasNotif,
    hasPush,
    iosNeedsInstall,
    permission: hasNotif ? Notification.permission : 'unsupported',
    subscribed,
  };
}

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function api(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, ...j };
}

// Ask for permission (must run from a tap), subscribe this device, tell the server.
export async function enableAlerts() {
  playChime(); // unlocks audio for this page while we have the tap
  if (!('Notification' in window)) return { ok: false, reason: 'unsupported' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { ok: true, push: false, reason: 'no_push' };

  const info = await api('/api/push');
  if (!info.configured || !info.publicKey) return { ok: true, push: false, reason: 'server_not_configured' };

  await navigator.serviceWorker.register('/sw.js');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(info.publicKey) });
  }
  const saved = await api('/api/push', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
  if (!saved.ok) return { ok: false, reason: 'save_failed' };
  pushActive = true;
  return { ok: true, push: true };
}

export async function disableAlerts() {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) {
      await api('/api/push', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
  } catch {}
  pushActive = false;
}

// Real push through the server (proves the whole path works), plus the chime.
export async function sendTestAlert() {
  playChime();
  return api('/api/push', { method: 'POST', body: JSON.stringify({ test: true }) });
}

// Fallback for browsers/devices without push: a pop-up from the open page.
export function localNotify(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && !pushActive) {
      new Notification(title, { body, icon: '/icon-192.png', tag: 'dino-order' });
    }
  } catch {}
}
