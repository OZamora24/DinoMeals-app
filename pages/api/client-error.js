import { rateLimit } from '../../lib/rateLimit';

// Customer-side crash reports (see lib/clientErrors.js). Logged so they show up in
// Vercel → Logs (search "client-error"). No personal info is collected.
const cut = (v, n) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').slice(0, n);

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!rateLimit(req, 'client-error', 10, 10 * 60 * 1000)) return res.status(204).end();
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  console.error('[client-error]', JSON.stringify({
    where: cut(b.where, 40), message: cut(b.message, 500), url: cut(b.url, 200), app: cut(b.app, 20),
    build: cut(b.build, 40), ua: cut(b.ua, 300), stack: cut(b.stack, 1500),
  }));
  return res.status(204).end();
}
