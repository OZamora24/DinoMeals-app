import { getSettings, saveSettings, isDemo, DEFAULT_SETTINGS } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { publicSettings } from '../../lib/publicSettings';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const s = await getSettings();
      if (isValidSession(req)) return res.status(200).json({ settings: { ...s, cook_date: publicSettings(s).cook_date }, demo: isDemo() });
      return res.status(200).json({ settings: publicSettings(s) });
    }
    if (req.method === 'POST') {
      if (!isValidSession(req)) return res.status(401).json({ error: 'Not logged in' });
      const patch = {};
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in (req.body || {})) patch[k] = req.body[k];
      if ('delivery_fee' in patch) patch.delivery_fee = Math.max(0, Number(patch.delivery_fee) || 0);
      if ('cutoff_day' in patch) patch.cutoff_day = Math.min(6, Math.max(0, parseInt(patch.cutoff_day, 10) || 0));
      if ('cutoff_hour' in patch) patch.cutoff_hour = Math.min(23, Math.max(0, parseInt(patch.cutoff_hour, 10) || 0));
      const s = await saveSettings(patch);
      return res.status(200).json({ settings: s });
    }
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
