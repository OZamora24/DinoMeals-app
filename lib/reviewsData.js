// Server side: published reviews worked into what the pages need, cached for a minute per server.
import { listReviews } from './db';
import { summarize, mealScores, publicReview } from './reviews';

const TTL = 60 * 1000;
export function clearReviewCache() { globalThis.__dinoReviewCache = null; }

export async function reviewData() {
  const c = globalThis.__dinoReviewCache;
  if (c && Date.now() - c.at < TTL) return c.value;
  let list = [];
  try { list = await listReviews(); } catch (e) { console.error('reviews', e?.message); }
  const scores = mealScores(list);
  const ready = Object.fromEntries(Object.entries(scores).filter(([, s]) => s.ready).map(([k, s]) => [k, { avg: s.avg, count: s.count }]));
  const value = { summary: summarize(list), scores: ready, items: list.map(publicReview) };
  globalThis.__dinoReviewCache = { at: Date.now(), value };
  return value;
}

// Small bundle for page props: the score, meal scores and the newest few reviews.
export async function reviewProps(n = 3) {
  const d = await reviewData();
  return { summary: d.summary, scores: d.scores, latest: d.items.slice(0, n), total: d.items.length };
}
