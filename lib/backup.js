// Weekly backup (Nov 2026): attached to the Monday 8 PM report email as one .json file.
// The Excel already has every order; this file also keeps what the Excel doesn't (menu & settings,
// promo codes, trainer partners, reviews, the text-reminder list, photo captions/order), so the
// whole app could be restored from it. Pictures themselves aren't included (Juan has the originals).
export const BACKUP_VERSION = 1;
const DROP_SETTINGS = ['push_subs']; // device push keys: can't be reused anyway

export async function buildBackup({ getSettings, listOrders, listReviews, listAllReminders, listPhotos, now = new Date() }) {
  const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { return { error: String(e?.message || e) }; } };
  const settings = await safe(() => getSettings({ fresh: true }));
  const cleanSettings = settings && !settings.error ? Object.fromEntries(Object.entries(settings).filter(([k]) => !DROP_SETTINGS.includes(k))) : settings;
  const data = {
    app: 'DinoMeals',
    version: BACKUP_VERSION,
    created_at: now.toISOString(),
    settings: cleanSettings,
    orders: await safe(() => listOrders()),
    reviews: await safe(() => listReviews({ includeHidden: true })),
    sms_reminders: await safe(() => listAllReminders()),
    photos: await safe(() => listPhotos({ includeHidden: true })),
  };
  data.counts = Object.fromEntries(['orders', 'reviews', 'sms_reminders', 'photos'].map((k) => [k, Array.isArray(data[k]) ? data[k].length : 'error']));
  return data;
}

export const backupFilename = (day) => `dinomeals-backup-${day}.json`;
export const backupBuffer = (data) => Buffer.from(JSON.stringify(data));
