// Safety net for customer-side crashes (for example an old copy of the site still open
// inside Instagram's browser after an update). Reports the error to /api/client-error
// (it shows in the Vercel logs) and reloads the page once to pick up the latest version.
const RELOAD_KEY = 'dino_crash_reload';
const RELOAD_WINDOW_MS = 60 * 1000; // at most one automatic reload per minute
let sent = 0;

const safe = (fn, fallback = null) => {
  try { return fn(); } catch { return fallback; }
};

// Instagram, Facebook, TikTok, Snapchat and similar apps open links in their own browser.
export const inAppBrowser = (ua = '') => {
  const m = /(Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Snapchat|Line\/|Twitter)/i.exec(String(ua));
  if (!m) return '';
  const k = m[1].toLowerCase();
  if (k.startsWith('fb')) return 'facebook';
  if (k === 'musical_ly') return 'tiktok';
  return k.replace('/', '');
};

// Old-version / missing-file errors: a reload fixes these.
export const isStaleAssetError = (msg = '') =>
  /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(String(msg));

export function reportClientError(err, where = 'unknown') {
  if (typeof window === 'undefined' || sent >= 5) return;
  sent += 1;
  const e = err || {};
  const body = JSON.stringify({
    where: String(where).slice(0, 40),
    message: String(e.message || e.reason || e).slice(0, 500),
    stack: String(e.stack || '').slice(0, 1500),
    url: safe(() => window.location.pathname + window.location.search, '').slice(0, 200),
    build: safe(() => window.__NEXT_DATA__.buildId, '') || '',
    ua: safe(() => navigator.userAgent, '').slice(0, 300),
    app: inAppBrowser(safe(() => navigator.userAgent, '')),
  });
  safe(() => {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }))) return;
    fetch('/api/client-error', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  });
}

// True (and remembers it) if we haven't auto-reloaded in the last minute.
export function canAutoReload(now = Date.now()) {
  const last = Number(safe(() => window.sessionStorage.getItem(RELOAD_KEY), 0)) || 0;
  if (now - last < RELOAD_WINDOW_MS) return false;
  const ok = safe(() => { window.sessionStorage.setItem(RELOAD_KEY, String(now)); return true; }, false);
  return ok; // no sessionStorage = no auto reload (avoids a reload loop)
}

export function reloadNow({ clearGuard = false } = {}) {
  if (clearGuard) safe(() => window.sessionStorage.removeItem(RELOAD_KEY));
  window.location.reload();
}
