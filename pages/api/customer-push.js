import { rateLimit } from '../../lib/rateLimit';
import { addCustomerPush, removeCustomerPush } from '../../lib/db';
import { pushConfigured, pushPublicKey } from '../../lib/push';
import { cleanSubscription, isAllowedEndpoint } from '../../lib/pushPayload';

// Public: a customer's phone turns promo / reminder notifications on or off.
//   GET     -> { configured, publicKey }   (the public VAPID key is not a secret)
//   POST    -> { subscription, lang }      saves this phone
//   DELETE  -> { endpoint }                removes this phone
// Only real browser push services are accepted as endpoints (see lib/pushPayload.js).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json({ configured: pushConfigured(), publicKey: pushPublicKey() });
    if (!['POST', 'DELETE'].includes(req.method)) return res.status(405).end();
    if (!rateLimit(req, 'cpush', 12, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
    if (!pushConfigured()) return res.status(503).json({ error: 'not_configured' });
    if (req.method === 'POST') {
      const sub = cleanSubscription(req.body && req.body.subscription);
      if (!sub) return res.status(400).json({ error: 'bad_subscription' });
      await addCustomerPush(sub, req.body && req.body.lang);
      return res.status(200).json({ ok: true });
    }
    const endpoint = req.body && req.body.endpoint;
    if (typeof endpoint !== 'string' || !isAllowedEndpoint(endpoint)) return res.status(400).json({ error: 'bad_endpoint' });
    await removeCustomerPush(endpoint);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('customer-push', e && e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
