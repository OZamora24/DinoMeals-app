import crypto from 'crypto';
import { isDemo } from './db';

const COOKIE_NAME = 'dino_admin';

// In demo mode (no Supabase configured) the admin password defaults to
// "dinodemo" so the preview works out of the box. On the real deploy,
// ADMIN_PASSWORD and SESSION_SECRET must be set in Vercel.
export function adminPassword() {
  return process.env.ADMIN_PASSWORD || (isDemo() ? 'dinodemo' : null);
}

const MAX_AGE_S = 60 * 60 * 24 * 30;

// Cookie value is "<expiry-ms>.<hmac of expiry>" so sessions really expire.
function sign(exp) {
  const secret = process.env.SESSION_SECRET || (isDemo() ? 'demo-secret' : null);
  if (!secret) throw new Error('Missing SESSION_SECRET environment variable.');
  return crypto.createHmac('sha256', secret).update(`dino-admin-session:${exp}`).digest('hex');
}

const secureFlag = () => (process.env.NODE_ENV === 'production' ? ' Secure;' : '');

export function makeSessionCookie() {
  const exp = Date.now() + MAX_AGE_S * 1000;
  return `${COOKIE_NAME}=${exp}.${sign(exp)}; HttpOnly;${secureFlag()} SameSite=Lax; Path=/; Max-Age=${MAX_AGE_S}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly;${secureFlag()} SameSite=Lax; Path=/; Max-Age=0`;
}

export function isValidSession(req) {
  const header = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    header.split(';').map((c) => {
      const i = c.indexOf('=');
      return i === -1 ? [c.trim(), ''] : [c.slice(0, i).trim(), c.slice(i + 1).trim()];
    })
  );
  const provided = cookies[COOKIE_NAME];
  if (!provided) return false;
  const [exp, sig = ''] = provided.split('.');
  if (!(Number(exp) > Date.now())) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
