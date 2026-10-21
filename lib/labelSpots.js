// Label-sheet math shared by the admin page (browser) and the labels API.
// Sheet = PLS504: 10 labels, 2 across x 5 down, spots numbered 1-10 left to right, top to bottom.
import { mealLineCount } from './menu.js';

export const LABELS_PER_SHEET = 10;
export const clampSpot = (n) => Math.max(1, Math.min(LABELS_PER_SHEET, Math.floor(Number(n) || 1)));

// How many labels an order prints: 1 per meal, 1 per lb (+1 for a half lb), 1 per extra portion.
export function labelCount(order) {
  let n = 0;
  for (const l of (order && order.items) || []) {
    if (l.type === 'meal') n += mealLineCount(l);
    else if (l.type === 'extra') n += Number(l.qty) || 0;
    else if (l.type === 'lb') { const lbs = Number(l.lbs) || 0; n += Math.floor(lbs) + (lbs % 1 ? 1 : 0); }
  }
  return n;
}

// Spot where the NEXT print starts after printing `count` labels beginning at `start`.
export const nextStart = (start, count) => ((clampSpot(start) - 1 + count) % LABELS_PER_SHEET) + 1;

// Sheets used by a print (a partly used first sheet counts as one).
export const sheetsUsed = (start, count) => (count ? Math.ceil((clampSpot(start) - 1 + count) / LABELS_PER_SHEET) : 0);
