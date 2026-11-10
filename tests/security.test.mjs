import test from 'node:test';
import assert from 'node:assert/strict';
import { lockedFor, afterFail, guardKey, MAX_FAILS, LOCK_MS, WINDOW_MS } from '../lib/loginGuard.js';
import { buildBackup, backupFilename } from '../lib/backup.js';
import { runWeeklyReport } from '../lib/weeklyReport.js';

test('login guard: 5 wrong passwords lock the device for 15 minutes', () => {
  const t0 = Date.parse('2026-11-10T10:00:00Z');
  let row = null;
  for (let i = 1; i < MAX_FAILS; i++) { const r = afterFail(row, t0 + i * 1000); assert.equal(r.justLocked, false); row = r; }
  assert.equal(row.fails, MAX_FAILS - 1);
  const locked = afterFail(row, t0 + 10000);
  assert.equal(locked.justLocked, true);
  assert.equal(lockedFor(locked, t0 + 10000), LOCK_MS / 60000);
  assert.equal(lockedFor(locked, t0 + 10000 + LOCK_MS + 1), 0);
});

test('login guard: old misses expire, and the key hides the IP', () => {
  const t0 = Date.parse('2026-11-10T10:00:00Z');
  const row = { fails: 4, last_fail_at: new Date(t0).toISOString() };
  const r = afterFail(row, t0 + WINDOW_MS + 1);
  assert.equal(r.fails, 1);
  assert.equal(r.justLocked, false);
  const k = guardKey('1.2.3.4', 's');
  assert.equal(k.length, 32);
  assert.ok(!k.includes('1.2.3.4'));
  assert.notEqual(k, guardKey('1.2.3.5', 's'));
});

test('backup: keeps settings (minus push keys), orders, reviews, text list, photos', async () => {
  const data = await buildBackup({
    getSettings: async () => ({ weekly_capacity: 40, promo_codes: [{ code: 'X' }], push_subs: [{ endpoint: 'e' }] }),
    listOrders: async () => [{ id: 1 }, { id: 2 }],
    listReviews: async () => [{ id: 'r' }],
    listAllReminders: async () => { throw new Error('down'); },
    listPhotos: async () => [{ id: 'p', caption: 'c' }],
    now: new Date('2026-11-10T04:00:00Z'),
  });
  assert.equal(data.settings.push_subs, undefined);
  assert.equal(data.settings.promo_codes[0].code, 'X');
  assert.deepEqual(data.counts, { orders: 2, reviews: 1, sms_reminders: 'error', photos: 1 });
  assert.equal(backupFilename('2026-11-16'), 'dinomeals-backup-2026-11-16.json');
});

test('weekly report email carries the backup as a second attachment', async () => {
  let sent = null;
  await runWeeklyReport({ start: '2026-11-02', listOrders: async () => [], send: async (m) => { sent = m; return { ok: true }; }, backup: { filename: 'dinomeals-backup-2026-11-09.json', content: Buffer.from('{}') } });
  assert.equal(sent.attachments.length, 2);
  assert.equal(sent.attachments[1].filename, 'dinomeals-backup-2026-11-09.json');
  assert.match(sent.text, /full backup/);
  assert.match(sent.html, /full backup/);
});
