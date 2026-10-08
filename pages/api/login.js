import crypto from 'crypto';
import { adminPassword, makeSessionCookie } from '../../lib/adminSession';

// Constant-time compare (hash both sides so lengths always match).
const safeEqual = (a, b) => {
  const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const correct = adminPassword();
  if (!correct) return res.status(500).json({ error: 'Server is missing ADMIN_PASSWORD.' });
  if (!safeEqual((req.body || {}).password ?? '', correct)) return res.status(401).json({ error: 'Wrong password.' });
  res.setHeader('Set-Cookie', makeSessionCookie());
  return res.status(200).json({ ok: true });
}
