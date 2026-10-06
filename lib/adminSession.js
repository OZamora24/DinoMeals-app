import crypto from 'crypto';
import { isDemo } from './db';

const COOKIE_NAME = 'dino_admin';

// In demo mode (no Supabase configured) the admin password defaults to
// "dinodemo" so the preview works out of the box. On the real deploy,
// ADMIN_PASSWORD and SESSION_SECRET must be set in Vercel.
export function adminPassword() {
  return process.env.ADMIN_PASSWORD || (isDemo() ? 'dinodemo' : null);
}

function sign() {
  const secret = process.env.SESSION_SECRET || (isDemo() ? 'demo-secret' : null);
  if (!secret) throw new Error('Missing SESSION_SECRET environment variable.');
  return crypto.createHmac('sha256', secret).update('dino-admin-session').digest('hex');
}

const secureFlag = () => (process.env.NODE_ENV === 'production' ? ' Secure;' : '');

export function makeSessionCookie() {
  const maxAge = 60 * 60 * 24 * 30;
  return `${COOKIE_NAME}=${sign()}; HttpOnly;${secureFlag()} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
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
  const a = Buffer.from(provided);
  const b = Buffer.from(sign());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
