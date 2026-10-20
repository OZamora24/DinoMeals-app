import { getSettings, saveSettings, countCustomerPush } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { rateLimit } from '../../lib/rateLimit';
import { dateKey, laNow } from '../../lib/menu';
import { sendPromoToCustomers, pushConfigured } from '../../lib/push';

// Admin: send one Messages pop-up to customers' phones as a notification.
//   POST { id }  -> only if that message is switched ON and inside its dates.
// Records when it was sent on the message so it is not sent twice by accident.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isValidSession(req)) return res.status(401).json({ error: 'Not logged in' });
  if (!rateLimit(req, 'popup-notify', 20, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
  if (!pushConfigured()) return res.status(200).json({ ok: false, error: 'push_not_configured' });
  try {
    const s = await getSettings({ fresh: true });
    const list = Array.isArray(s.popups) ? s.popups : [];
    const popup = list.find((p) => p.id === (req.body && req.body.id));
    if (!popup) return res.status(404).json({ ok: false, error: 'message_not_found' });
    const today = dateKey(laNow());
    if (!popup.active) return res.status(200).json({ ok: false, error: 'message_is_off' });
    if ((popup.start && popup.start > today) || (popup.end && popup.end < today)) return res.status(200).json({ ok: false, error: 'outside_dates' });
    const r = await sendPromoToCustomers(popup);
    const popups = list.map((p) => (p.id === popup.id ? { ...p, notified_at: Date.now(), notified_count: r.sent } : p));
    await saveSettings({ popups });
    return res.status(200).json({ ok: true, sent: r.sent, failed: r.failed, removed: r.removed || 0, phones: await countCustomerPush(), popups });
  } catch (e) {
    console.error('popup-notify', e && e.message);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
