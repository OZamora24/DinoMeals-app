import { isValidSession } from '../../lib/adminSession';
import { pushConfigured, pushPublicKey, listSubscriptions, addSubscription, removeSubscription, sendToAll } from '../../lib/push';

// Admin-only: register/unregister this device for new-order push notifications.
export default async function handler(req, res) {
  if (!isValidSession(req)) return res.status(401).json({ error: 'Not logged in' });
  try {
    if (req.method === 'GET') {
      const subs = await listSubscriptions();
      return res.status(200).json({ configured: pushConfigured(), publicKey: pushPublicKey(), devices: subs.length });
    }
    if (!pushConfigured()) return res.status(503).json({ error: 'Push is not set up on the server yet.' });

    if (req.method === 'POST') {
      if (req.body?.test) {
        const r = await sendToAll({ title: 'DinoMeals test', body: 'Alerts are working. New orders will show up like this.', url: '/admin', tag: 'test' });
        return res.status(200).json(r);
      }
      const r = await addSubscription(req.body?.subscription);
      return res.status(r.ok ? 200 : 400).json(r);
    }
    if (req.method === 'DELETE') {
      const endpoint = req.body?.endpoint;
      if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
      return res.status(200).json(await removeSubscription(endpoint));
    }
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
