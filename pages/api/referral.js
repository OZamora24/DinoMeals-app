import { getSettings, ordersByPhone, ordersReferredBy } from '../../lib/db';
import { rateLimit } from '../../lib/rateLimit';
import { normalizePhone } from '../../lib/orderRow';
import { referralConfig, isNewCustomer, referralsThisMonth, normRef } from '../../lib/referral';
import { resolveCode } from '../../lib/referralCode';

// Public: checks a referral code at checkout. ?code=MARCUS-7Q2K&phone=9095550123
// Returns only the referrer's FIRST name and whether this phone can use it (first order only).
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  if (!rateLimit(req, 'referral', 30, 10 * 60 * 1000)) return res.status(429).json({ error: 'slow_down' });
  try {
    const s = await getSettings();
    const cfg = referralConfig(s);
    if (!cfg.on) return res.status(200).json({ ok: false, note: 'ref_off' });
    const code = normRef(req.query.code);
    const owner = code ? await resolveCode(code) : null;
    if (!owner) return res.status(200).json({ ok: false, note: 'ref_invalid' });
    const first = String(owner.name || '').split(' ')[0];
    const digits = normalizePhone(req.query.phone);
    if (digits.length !== 10) return res.status(200).json({ ok: true, valid: true, name: first, pct: cfg.new_pct, note: 'need_phone' });
    if (digits === owner.digits) return res.status(200).json({ ok: false, valid: true, name: first, note: 'ref_self' });
    if (!isNewCustomer(await ordersByPhone(digits, 5))) return res.status(200).json({ ok: false, valid: true, name: first, note: 'ref_not_new' });
    if (cfg.monthly_cap && referralsThisMonth(await ordersReferredBy(owner.digits)) >= cfg.monthly_cap) return res.status(200).json({ ok: false, valid: true, name: first, note: 'ref_cap' });
    return res.status(200).json({ ok: true, valid: true, name: first, pct: cfg.new_pct });
  } catch (e) {
    console.error('referral', e && e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
