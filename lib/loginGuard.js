// Kitchen login protection (Nov 2026).
//  - 5 wrong passwords from one device (IP) within 15 minutes -> that device is locked for 15 minutes.
//  - Saved in the database (login_guard), so it holds across Vercel's servers and restarts
//    (the old in-memory limit only counted per server).
//  - When a device gets locked, the kitchen's devices get a push: "⚠️ Kitchen login locked".
//  - If the database can't be reached, the login still works (with the in-memory limit), so Juan is
//    never locked out by an outage.
import crypto from 'crypto';

export const MAX_FAILS = 5;
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;

// The IP is stored hashed (we only need to recognize the same device again).
export const guardKey = (ip, secret = process.env.SESSION_SECRET || 'dino') =>
  crypto.createHmac('sha256', secret).update(`login:${ip}`).digest('hex').slice(0, 32);

// Pure rules (tested): given the saved row and now, is this device locked?
export function lockedFor(row, now = Date.now()) {
  const until = row && row.locked_until ? Date.parse(row.locked_until) : 0;
  return until > now ? Math.ceil((until - now) / 60000) : 0; // minutes left
}

// Pure rules (tested): the row after one more wrong password.
export function afterFail(row, now = Date.now()) {
  const last = row && row.last_fail_at ? Date.parse(row.last_fail_at) : 0;
  const fails = (last && now - last < WINDOW_MS ? (row.fails || 0) : 0) + 1;
  const lock = fails >= MAX_FAILS;
  return {
    fails: lock ? 0 : fails,
    last_fail_at: new Date(now).toISOString(),
    locked_until: lock ? new Date(now + LOCK_MS).toISOString() : (row && row.locked_until) || null,
    justLocked: lock,
  };
}
