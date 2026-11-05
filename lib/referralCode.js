// Server-only: personal referral codes. code = FIRSTNAME + 5 letters made from the phone number
// with a secret, so nobody can guess someone else's code or read a phone number out of it.
import crypto from 'crypto';
import { recentOrders } from './db';
import { normRef, refKey } from './referral';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const secret = () => process.env.SESSION_SECRET || process.env.DINO_DB_SECRET || 'demo-referral-secret';

export function keyFor(digits) {
  const h = crypto.createHmac('sha256', secret()).update(`dino-ref:${digits}`).digest();
  let s = '';
  for (let i = 0; i < 5; i++) s += ABC[h[i] % ABC.length];
  return s;
}
export function codeFor(digits, name = '') {
  const first = String(name || '').split(/\s+/)[0].normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8) || 'DINO';
  return `${first}-${keyFor(digits)}`;
}

// Finds who owns a code: { digits, name } or null.
export async function resolveCode(code) {
  const k = refKey(code);
  if (normRef(code).length < 5 || k.length !== 5) return null;
  const seen = new Set();
  for (const o of await recentOrders(3650)) {
    const d = o.phone_digits;
    if (!d || seen.has(d)) continue;
    seen.add(d);
    if (keyFor(d) === k) return { digits: d, name: o.customer_name || '' };
  }
  return null;
}
