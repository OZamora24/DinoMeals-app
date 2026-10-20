import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { mondayOf, previousWeek, weekLabel, sheetName, weekStats, buildWeeklyReportWorkbook, reportEmail, runWeeklyReport } from '../lib/weeklyReport.js';
import { sendMail, mailStatus } from '../lib/mailer.js';
import { cleanPopups, activePopups } from '../lib/popups.js';

const order = (no, cook, o = {}) => ({
  order_no: no, customer_name: `C${no}`, phone: '(909) 555-0100', status: 'new', paid: false, total: 100, subtotal: 100,
  delivery_fee: 0, meal_count: 8, lb_total: 0, fulfillment: 'pickup', payment_method: 'zelle', cook_date: cook, items: [],
  created_at: '2026-10-10T20:00:00Z', source: 'web', ...o,
});

test('week math: Monday-Sunday, "the week before" from a Monday evening', () => {
  assert.equal(mondayOf('2026-10-19'), '2026-10-19'); // Monday
  assert.equal(mondayOf('2026-10-25'), '2026-10-19'); // Sunday belongs to the week that starts the Monday before
  assert.equal(mondayOf('2026-10-18'), '2026-10-12');
  assert.deepEqual(previousWeek(new Date(2026, 9, 19, 20, 0)), { start: '2026-10-12', end: '2026-10-18' });
  assert.deepEqual(previousWeek(new Date(2026, 9, 26, 20, 0)), { start: '2026-10-19', end: '2026-10-25' });
  assert.equal(weekLabel('2026-10-12'), 'Mon Oct 12 – Sun Oct 18, 2026');
  assert.equal(sheetName('2026-10-12'), 'Oct 12-18');
  assert.equal(sheetName('2026-10-26'), 'Oct 26-Nov 1');
});

test('week stats skip cancelled orders and split paid / owed', () => {
  const st = weekStats([
    order(1, '2026-10-18', { paid: true, total: 100 }),
    order(2, '2026-10-18', { total: 50, payment_method: 'cash', fulfillment: 'delivery', delivery_fee: 0 }),
    order(3, '2026-10-18', { status: 'cancelled', total: 999 }),
  ]);
  assert.equal(st.orders, 2);
  assert.equal(st.cancelled, 1);
  assert.equal(st.sales, 150);
  assert.equal(st.collected, 100);
  assert.equal(st.owed, 50);
  assert.equal(st.average, 75);
  assert.equal(st.pickup, 1);
  assert.equal(st.delivery, 1);
  assert.equal(st.zelle, 100);
  assert.equal(st.cash, 50);
});

test('report workbook: Orders + Summary for the week, then one tab per week so far (no future weeks)', async () => {
  const all = [
    order(1, '2026-10-04'), order(2, '2026-10-11'), order(3, '2026-10-18', { paid: true }), order(4, '2026-10-18'),
    order(5, '2026-10-25'), // next week's batch (not finished yet): must NOT appear
  ];
  const { wb, stats, weekCount } = await buildWeeklyReportWorkbook(all, '2026-10-12');
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Orders', 'Summary', 'Sep 28-Oct 4', 'Oct 5-11', 'Oct 12-18']);
  assert.equal(weekCount, 3);
  assert.equal(stats.orders, 2);
  assert.equal(stats.sales, 200);
  // round-trip through xlsx to be sure it is a valid file with the week's two orders
  const re = new ExcelJS.Workbook();
  await re.xlsx.load(await wb.xlsx.writeBuffer());
  assert.equal(re.worksheets.length, 5);
  const orders = re.getWorksheet('Orders');
  const nos = [];
  orders.eachRow((row) => { const v = row.getCell(1).value; if (typeof v === 'number') nos.push(v); });
  assert.deepEqual(nos, [3, 4]);
});

test('report with no orders still builds (an empty week tab is added)', async () => {
  const { wb, stats } = await buildWeeklyReportWorkbook([], '2026-10-12');
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Orders', 'Summary', 'Oct 12-18']);
  assert.equal(stats.orders, 0);
});

test('email text and runWeeklyReport hands the Excel file to the sender', async () => {
  const mail = reportEmail('2026-10-12', weekStats([order(1, '2026-10-18', { paid: true, total: 168 })]));
  assert.match(mail.subject, /DinoMeals weekly report/);
  assert.match(mail.subject, /\$168/);
  assert.match(mail.html, /Total sales/);
  let sent = null;
  const r = await runWeeklyReport({ start: '2026-10-12', listOrders: async () => [order(1, '2026-10-18', { paid: true, total: 168 })], send: async (m) => { sent = m; return { ok: true }; } });
  assert.equal(r.ok, true);
  assert.equal(sent.attachments[0].filename, 'dinomeals-weekly-report-2026-10-12.xlsx');
  assert.ok(sent.attachments[0].content.length > 5000);
});

test('mailer: off without a key, posts to Resend with the attachment, reports API errors', async () => {
  assert.equal(mailStatus({}).configured, false);
  assert.equal(mailStatus({}).to, 'dinomealsllc@gmail.com');
  assert.deepEqual(await sendMail({ subject: 'x' }, { env: {} }), { ok: false, error: 'email_not_configured' });
  let call = null;
  const okFetch = async (url, init) => { call = { url, init }; return { ok: true, json: async () => ({ id: 'abc' }) }; };
  const env = { RESEND_API_KEY: 're_test', REPORT_FROM: 'DinoMeals <reports@dinomeals.app>' };
  const r = await sendMail({ subject: 'S', html: '<b>h</b>', text: 't', attachments: [{ filename: 'a.xlsx', content: Buffer.from('hi') }] }, { env, fetchImpl: okFetch });
  assert.deepEqual(r, { ok: true, id: 'abc' });
  const body = JSON.parse(call.init.body);
  assert.equal(call.url, 'https://api.resend.com/emails');
  assert.equal(call.init.headers.Authorization, 'Bearer re_test');
  assert.deepEqual(body.to, ['dinomealsllc@gmail.com']);
  assert.equal(body.from, 'DinoMeals <reports@dinomeals.app>');
  assert.equal(body.attachments[0].content, Buffer.from('hi').toString('base64'));
  const bad = await sendMail({ subject: 'S' }, { env, fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ message: 'domain not verified' }) }) });
  assert.deepEqual(bad, { ok: false, error: 'domain not verified' });
});

test('pop-ups: cleaned, capped, links limited, only active in-date ones go public', () => {
  const list = cleanPopups([
    { id: 'a1', title: '  10% off  ', body: 'Order by Friday', cta_label: 'Order now', cta_url: '/order', active: true, start: '2026-10-01', end: '2026-10-31', updated: 5 },
    { id: 'a1', title: 'dup id', body: '', active: true }, // duplicate id gets a new one
    { title: '', body: '' }, // nothing to show: dropped
    { title: 'Bad link', cta_label: 'Go', cta_url: 'javascript:alert(1)', active: false },
    { title: 'Proto-relative', cta_url: '//evil.com' },
    { title: 'x'.repeat(500), body: 'y'.repeat(5000) },
    'junk', null,
  ], 111);
  assert.equal(list.length, 5);
  assert.equal(list[0].title, '10% off');
  assert.equal(list[0].updated, 5);
  assert.notEqual(list[1].id, 'a1');
  assert.equal(list[2].cta_url, '');
  assert.equal(list[3].cta_url, '');
  assert.equal(list[4].title.length, 80);
  assert.equal(list[4].body.length, 600);
  assert.equal(cleanPopups(Array.from({ length: 30 }, (_, i) => ({ title: `t${i}` }))).length, 12);
  assert.deepEqual(cleanPopups('nope'), []);
  const pub = activePopups(list, '2026-10-20');
  assert.deepEqual(pub.map((p) => p.title), ['10% off', 'dup id', 'Proto-relative', list[4].title]); // the switched-off one is not public
  assert.equal(activePopups(list, '2026-11-02').some((p) => p.title === '10% off'), false); // after the end date
  assert.equal(activePopups(list, '2026-09-30').some((p) => p.title === '10% off'), false); // before the start date
  assert.ok(!('active' in pub[0]) && !('start' in pub[0])); // admin-only fields stay private
});
