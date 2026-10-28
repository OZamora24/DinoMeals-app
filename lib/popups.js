// Promo / discount pop-up messages the kitchen writes by hand in /admin → Messages.
// Stored in shop_settings.popups. Customers only ever get the active, in-date ones.

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
// Only the site's own pages (or full https links) can be the button target.
const cta = (v) => {
  const u = clip(v, 200);
  return u.startsWith('/') && !u.startsWith('//') ? u : /^https:\/\/[^\s]+$/i.test(u) ? u : '';
};

export const MAX_POPUPS = 12;

export function cleanPopups(list, now = Date.now()) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const p of list.slice(0, MAX_POPUPS)) {
    if (!p || typeof p !== 'object') continue;
    let id = clip(p.id, 24).replace(/[^a-z0-9]/gi, '');
    if (!id || seen.has(id)) id = `m${now.toString(36)}${out.length}`;
    seen.add(id);
    const title = clip(p.title, 60);
    const body = clip(p.body, 180);
    if (!title && !body) continue; // nothing to show
    out.push({
      id,
      title,
      body,
      title_es: clip(p.title_es, 60),
      body_es: clip(p.body_es, 180),
      cta_label: clip(p.cta_label, 30),
      cta_url: cta(p.cta_url),
      cta_label_es: clip(p.cta_label_es, 30),
      active: p.active !== false && p.active !== 'false',
      notify: p.notify !== false && p.notify !== 'false', // also send as a phone notification
      site: p.site === true || p.site === 'true', // also pop up once when someone opens the website
      notified_at: Number(p.notified_at) > 0 ? Number(p.notified_at) : 0, // when it was last pushed (0 = not yet)
      notified_count: Math.max(0, Math.floor(Number(p.notified_count) || 0)),
      start: ymd(p.start),
      end: ymd(p.end),
      updated: Number(p.updated) > 0 ? Number(p.updated) : now,
    });
  }
  return out;
}

// The text of one message for the app's "after you tap the notification" card. Only a message that has
// really been sent (and is still ON) is returned, and only its words, never the admin fields.
export function publicPromo(list, id) {
  const p = (Array.isArray(list) ? list : []).find((x) => x && x.id === id);
  if (!p || !p.active || !(p.notified_at > 0)) return null;
  return { id: p.id, title: p.title || '', body: p.body || '', title_es: p.title_es || '', body_es: p.body_es || '' };
}

// The message to pop up on the website (home + order page) for everyone, once per device:
// the newest one that is ON, marked "site", and inside its start/end dates (Pacific day).
export function sitePopup(list, today = '') {
  const live = (Array.isArray(list) ? list : []).filter((p) => p && p.active && p.site && (!p.start || !today || p.start <= today) && (!p.end || !today || today <= p.end));
  const p = live.sort((a, b) => (b.updated || 0) - (a.updated || 0))[0];
  if (!p) return null;
  const { id, title, body, title_es, body_es, cta_label, cta_url, cta_label_es } = p;
  return { id, title: title || '', body: body || '', title_es: title_es || '', body_es: body_es || '', cta_label: cta_label || '', cta_url: cta_url || '', cta_label_es: cta_label_es || '' };
}
