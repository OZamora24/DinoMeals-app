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
    const title = clip(p.title, 80);
    const body = clip(p.body, 600);
    if (!title && !body) continue; // nothing to show
    out.push({
      id,
      title,
      body,
      title_es: clip(p.title_es, 80),
      body_es: clip(p.body_es, 600),
      cta_label: clip(p.cta_label, 30),
      cta_url: cta(p.cta_url),
      cta_label_es: clip(p.cta_label_es, 30),
      active: p.active !== false && p.active !== 'false',
      start: ymd(p.start),
      end: ymd(p.end),
      updated: Number(p.updated) > 0 ? Number(p.updated) : now,
    });
  }
  return out;
}

// What the public site gets: only messages that are switched on and inside their date window.
export function activePopups(list, today) {
  return (Array.isArray(list) ? list : [])
    .filter((p) => p && p.active && (!p.start || p.start <= today) && (!p.end || p.end >= today))
    .map(({ id, title, body, title_es, body_es, cta_label, cta_url, cta_label_es, updated }) => ({
      id, title, body, title_es, body_es, cta_label, cta_url, cta_label_es, updated,
    }));
}
