import crypto from 'crypto';
import { rateLimit, clientIp } from '../../lib/rateLimit';
import { adminPassword, makeSessionCookie } from '../../lib/adminSession';
import { getLoginGuard, saveLoginGuard, clearLoginGuard } from '../../lib/db';
import { guardKey, lockedFor, afterFail, LOCK_MS } from '../../lib/loginGuard';
import { sendToAll } from '../../lib/push';

// Constant-time compare (hash both sides so lengths always match).
const safeEqual = (a, b) => {
  const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};
const lockedMsg = (min) => `Too many wrong passwords. This device is locked for ${min} more minute${min === 1 ? '' : 's'}.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  if (!rateLimit(req, 'login', 8, 15 * 60 * 1000)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  const correct = adminPassword();
  if (!correct) return res.status(500).json({ error: 'Server is missing ADMIN_PASSWORD.' });

  // Saved lock (works across servers). A database problem never blocks the login.
  const key = guardKey(clientIp(req));
  let row = null;
  let guardOk = true;
  try { row = await getLoginGuard(key); } catch (e) { guardOk = false; console.error('login guard read', e?.message); }
  const min = lockedFor(row);
  if (min) return res.status(429).json({ error: lockedMsg(min) });

  if (!safeEqual((req.body || {}).password ?? '', correct)) {
    if (guardOk) {
      const next = afterFail(row);
      const { justLocked, ...save } = next;
      try { await saveLoginGuard(key, save); } catch (e) { console.error('login guard save', e?.message); }
      if (justLocked) {
        try {
          await sendToAll({ title: '⚠️ Kitchen login locked', body: `5 wrong passwords from one device. It's locked for ${LOCK_MS / 60000} minutes. If this wasn't you, think about changing the admin password.`, url: '/admin', tag: 'login-lock' });
        } catch (e) { console.error('lock push', e?.message); }
        return res.status(429).json({ error: lockedMsg(LOCK_MS / 60000) });
      }
    }
    return res.status(401).json({ error: 'Wrong password.' });
  }
  if (guardOk && row) { try { await clearLoginGuard(key); } catch {} }
  res.setHeader('Set-Cookie', makeSessionCookie());
  return res.status(200).json({ ok: true });
}
