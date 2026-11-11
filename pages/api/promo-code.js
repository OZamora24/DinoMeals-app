import { getSettings, ordersByPhone } from '../../lib/db';
import { rateLimit } from '../../lib/rateLimit';
import { findPromo, normCode, promoBlock } from '../../lib/promo';
import { dateKey, laNow } from '../../lib/menu';
import { trainerConfig, findTrainer } from '../../lib/trainer';

// Public: checks a promo code typed at checkout. Returns only that code's discount
// (never the list of codes). The order API checks it again when the order is placed.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  if (!rateLimit(req, 'promo-code', 20, 10 * 60 * 1000)) return res.status(429).json({ error: 'slow_down' });
  try {
    const code = normCode(req.query.code);
    if (!code) return res.status(400).json({ error: 'promo_invalid' });
    const s = await getSettings();
    const promo = findPromo(s.promo_codes, code, dateKey(laNow()));
    if (!promo) {
      // A trainer's code (Trainer Partner program): only the first name and the two % go out.
      const tc = trainerConfig(s);
      const tr = tc.on ? findTrainer(s.trainers, code) : null;
      if (tr) return res.status(200).json({ trainer: { code: tr.code, name: tr.name.split(' ')[0], first_pct: tc.first_pct, pct: tc.pct } });
      return res.status(404).json({ error: 'promo_invalid' });
    }
    // With the phone typed at checkout: say right away if this customer can't use a one-time or
    // new-customers code (the order is checked again when it's placed).
    const digits = String(req.query.phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if ((promo.once || promo.new_only) && digits.length === 10) {
      const block = promoBlock(promo, await ordersByPhone(digits, 500).catch(() => []));
      if (block) return res.status(409).json({ error: block });
    }
    return res.status(200).json({ promo: { code: promo.code, type: promo.type, value: promo.value, ...(promo.new_only ? { new_only: true } : {}), ...(promo.once ? { once: true } : {}) } });
  } catch (e) {
    console.error('promo-code', e && e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
