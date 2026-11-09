import { getOrderByToken, reviewForOrder, insertReview, listReviews, updateReview } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { rateLimit } from '../../lib/rateLimit';
import { cleanReview, canReview, publicReview, summarize, mealScores, scoreboard } from '../../lib/reviews';
import { reviewData, clearReviewCache } from '../../lib/reviewsData';
import { dateKey, laNow } from '../../lib/menu';

// Customer reviews (lib/reviews.js).
//   GET  ?offset=0            -> public: { summary, scores, items[6], more }
//   GET  ?all=1               -> admin: every review (hidden too) + scoreboard
//   POST { token, stars, meals, comment, lang } -> customer, from their private order page
//   PATCH { id, reply?, status? }               -> admin: public reply / hide / show
export default async function handler(req, res) {
  try {
    const admin = isValidSession(req);
    if (req.method === 'GET') {
      if (req.query.all) {
        if (!admin) return res.status(401).json({ error: 'Not logged in' });
        res.setHeader('Cache-Control', 'no-store');
        const all = await listReviews({ includeHidden: true });
        return res.status(200).json({ reviews: all.map((r) => ({ ...publicReview(r), order_no: r.order_no, status: r.status, meals_all: r.meals || [], reply_at: r.reply_at })), summary: summarize(all), board: scoreboard(mealScores(all)) });
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      const d = await reviewData();
      const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
      return res.status(200).json({ summary: d.summary, scores: d.scores, items: d.items.slice(offset, offset + 6), more: d.items.length > offset + 6 });
    }
    if (req.method === 'POST') {
      if (!rateLimit(req, 'review', 8, 10 * 60 * 1000)) return res.status(429).json({ error: 'slow_down' });
      const order = await getOrderByToken(String((req.body && req.body.token) || ''));
      if (!order) return res.status(404).json({ error: 'not_found' });
      if (!canReview(order, dateKey(laNow()))) return res.status(400).json({ error: 'not_open' });
      if (await reviewForOrder(order.id)) return res.status(409).json({ error: 'already' });
      const c = cleanReview(req.body || {}, order);
      if (c.error) return res.status(400).json(c);
      let saved;
      try { saved = await insertReview(c.review); } catch (e) {
        if (e && (e.code === '23505' || /duplicate/i.test(e.message || ''))) return res.status(409).json({ error: 'already' });
        throw e;
      }
      clearReviewCache();
      return res.status(200).json({ ok: true, review: publicReview(saved) });
    }
    if (req.method === 'PATCH') {
      if (!admin) return res.status(401).json({ error: 'Not logged in' });
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if ('reply' in req.body) {
        patch.reply = String(req.body.reply || '').trim().slice(0, 500);
        patch.reply_at = patch.reply ? new Date().toISOString() : null;
      }
      if ('status' in req.body && ['published', 'hidden'].includes(req.body.status)) patch.status = req.body.status;
      const r = await updateReview(id, patch);
      clearReviewCache();
      return res.status(200).json({ review: r && { ...publicReview(r), order_no: r.order_no, status: r.status, meals_all: r.meals || [] } });
    }
    return res.status(405).end();
  } catch (e) {
    console.error('reviews api', e && e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
