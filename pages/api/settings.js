import { getSettings, saveSettings, isDemo, DEFAULT_SETTINGS } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { publicSettings, publicSettingsWithCapacity } from '../../lib/publicSettings';
import { smsStatus } from '../../lib/sms';
import { cleanPopups } from '../../lib/popups';
import { mailStatus } from '../../lib/mailer';
import { countCustomerPush } from '../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const s = await getSettings();
      if (isValidSession(req)) {
        const { push_subs, ...rest } = s; // device endpoints stay server-side
        return res.status(200).json({ settings: { ...rest, cook_date: publicSettings(s).cook_date, _sms: smsStatus(), _mail: mailStatus(), _push_customers: await countCustomerPush() }, demo: isDemo() });
      }
      return res.status(200).json({ settings: await publicSettingsWithCapacity(s) });
    }
    if (req.method === 'POST') {
      if (!isValidSession(req)) return res.status(401).json({ error: 'Not logged in' });
      const patch = {};
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (k !== 'push_subs' && k !== 'last_report_week' && k in (req.body || {})) patch[k] = req.body[k];
      if ('popups' in patch) patch.popups = cleanPopups(patch.popups);
      if ('delivery_fee' in patch) patch.delivery_fee = Math.max(0, Number(patch.delivery_fee) || 0);
      if ('card_fee' in patch) patch.card_fee = Math.max(0, Number(patch.card_fee) || 0);
      if ('weekly_capacity' in patch) patch.weekly_capacity = Math.max(0, parseInt(patch.weekly_capacity, 10) || 0);
      if ('cutoff_day' in patch) patch.cutoff_day = Math.min(6, Math.max(0, parseInt(patch.cutoff_day, 10) || 0));
      if ('cutoff_hour' in patch) patch.cutoff_hour = Math.min(23, Math.max(0, parseInt(patch.cutoff_hour, 10) || 0));
      const { push_subs, ...s } = await saveSettings(patch);
      return res.status(200).json({ settings: { ...s, _sms: smsStatus(), _mail: mailStatus(), _push_customers: await countCustomerPush() } });
    }
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
