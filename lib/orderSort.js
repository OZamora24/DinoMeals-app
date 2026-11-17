// Admin order list sorting (Juan, Nov 2026).
//  - asc:    order # low → high (first order on top, the old default)
//  - desc:   order # high → low (newest on top)
//  - custom: Juan's own order. He holds an order and drags it; the order is saved per cook day in
//            shop_settings.order_rank = { '2026-11-22': [orderId, ...] }. Orders that aren't in his
//            list yet (new ones) go at the end, low → high.
// Pure helpers, shared by the admin page, the settings API and the tests.

export const SORTS = ['asc', 'desc', 'custom'];
const byNo = (a, b) => (Number(a.order_no) || 0) - (Number(b.order_no) || 0);

export function applySort(list = [], sort = 'asc', rank = []) {
  const out = list.slice().sort(byNo);
  if (sort === 'desc') return out.reverse();
  if (sort !== 'custom' || !rank || !rank.length) return out;
  const pos = new Map(rank.map((id, i) => [id, i]));
  return out.sort((a, b) => {
    const pa = pos.has(a.id) ? pos.get(a.id) : Infinity;
    const pb = pos.has(b.id) ? pos.get(b.id) : Infinity;
    return pa !== pb ? pa - pb : byNo(a, b);
  });
}

// Move `id` next to `targetId` (before it, or after it when `after`). Returns a new array.
export function moveId(ids = [], id, targetId, after = false) {
  if (id === targetId || !ids.includes(id) || !ids.includes(targetId)) return ids;
  const rest = ids.filter((x) => x !== id);
  const i = rest.indexOf(targetId) + (after ? 1 : 0);
  return [...rest.slice(0, i), id, ...rest.slice(i)];
}

const isWeek = (w) => /^\d{4}-\d{2}-\d{2}$/.test(String(w || ''));
const isId = (x) => typeof x === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(x);

// What's saved: only real cook days, at most 300 ids each, newest 12 weeks.
export function cleanRank(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const weeks = Object.keys(raw).filter(isWeek).sort().slice(-12);
  const out = {};
  for (const w of weeks) {
    if (!Array.isArray(raw[w])) continue;
    out[w] = [...new Set(raw[w].filter(isId))].slice(0, 300);
  }
  return out;
}
