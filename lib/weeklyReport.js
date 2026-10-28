// Weekly sales report: emailed every Monday 8 PM Pacific for the week before (Monday → Sunday).
// "Week" = the orders whose cook day falls in that Monday–Sunday (the cook day is the Sunday).
// The workbook is rebuilt from the database every time, so it keeps growing on its own:
//   Orders  – the reported week, one row per order (the same sheet as the admin export)
//   Summary – the reported week's totals (the same sheet as the admin export)
//   one tab per week ("Oct 12-18") for every week so far, oldest to newest, each with
//   that week's totals and its orders.
import { addDays, laNow, dateKey } from './menu.js';
import { buildOrdersWorkbook, rowValues } from './exportXlsx.js';

const BRAND = { ink: 'FF141110', red: 'FFE2372D', cream: 'FFF6EFE3', line: 'FFE4DDD2', muted: 'FF6B6150' };
const FONT = 'Arial';
const MONEY = '$#,##0.00;-$#,##0.00;"–"';

const ymd = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};
const fmt = (key, opts) => ymd(key).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });

export function mondayOf(key) {
  const dow = ymd(key).getUTCDay(); // 0 = Sunday
  return addDays(key, -((dow + 6) % 7));
}

// The Monday–Sunday that just ended, given "now" in Los Angeles.
export function previousWeek(now = laNow()) {
  const thisMonday = mondayOf(dateKey(now));
  const start = addDays(thisMonday, -7);
  return { start, end: addDays(start, 6) };
}

export function weekLabel(start) {
  const end = addDays(start, 6);
  return `Mon ${fmt(start, { month: 'short', day: 'numeric' })} – Sun ${fmt(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// Short tab name: "Oct 12-18" or "Oct 26-Nov 1".
export function sheetName(start) {
  const end = addDays(start, 6);
  const m1 = fmt(start, { month: 'short' });
  const m2 = fmt(end, { month: 'short' });
  const d1 = fmt(start, { day: 'numeric' });
  const d2 = fmt(end, { day: 'numeric' });
  return m1 === m2 ? `${m1} ${d1}-${d2}` : `${m1} ${d1}-${m2} ${d2}`;
}

const round2 = (n) => Math.round(n * 100) / 100;

export function weekStats(orders) {
  const rows = (orders || []).map(rowValues);
  const live = rows.filter((v) => v.status !== 'Cancelled');
  const sum = (key, list = live) => round2(list.reduce((n, v) => n + (Number(v[key]) || 0), 0));
  const sales = sum('total');
  const collected = sum('total', live.filter((v) => v.paid === 'Yes'));
  const withTotal = live.filter((v) => Number(v.total) > 0).length;
  return {
    orders: live.length,
    cancelled: rows.length - live.length,
    meals: sum('meals'),
    lbs: sum('lbs'),
    food: sum('subtotal'),
    discounts: sum('discount'),
    deliveryFees: sum('fee'),
    cardFees: sum('cardfee'),
    sales,
    collected,
    owed: round2(sales - collected),
    average: withTotal ? round2(sales / withTotal) : 0,
    pickup: live.filter((v) => v.how === 'Pickup').length,
    delivery: live.filter((v) => v.how === 'Delivery').length,
    zelle: sum('total', live.filter((v) => v.pay === 'Zelle')),
    cash: sum('total', live.filter((v) => v.pay === 'Cash')),
    card: sum('total', live.filter((v) => v.pay === 'Card')),
  };
}

function addWeekSheet(wb, start, orders) {
  const ws = wb.addWorksheet(sheetName(start), { views: [{ showGridLines: false }] });
  ws.columns = [
    { width: 9 }, { width: 22 }, { width: 58 }, { width: 8 }, { width: 8 }, { width: 12 }, { width: 8 }, { width: 10 }, { width: 14 }, { width: 12 },
  ];
  ws.mergeCells('A1:J1');
  const t = ws.getCell('A1');
  t.value = { richText: [{ text: 'DINO ', font: { name: FONT, size: 16, bold: true, color: { argb: BRAND.red } } }, { text: `MEALS  ·  ${weekLabel(start).toUpperCase()}`, font: { name: FONT, size: 16, bold: true, color: { argb: BRAND.cream } } }] };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ink } };
  t.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 34;

  const st = weekStats(orders);
  const stats = [
    ['Orders (not cancelled)', st.orders, '0'], ['Cancelled', st.cancelled, '0'],
    ['Meals', st.meals, '0'], ['Lbs', st.lbs, '0.0'],
    ['Food subtotal', st.food, MONEY], ['Promo discounts', -st.discounts, MONEY], ['Delivery fees', st.deliveryFees, MONEY], ['Card fees', st.cardFees, MONEY],
    ['TOTAL SALES', st.sales, MONEY], ['Collected (paid)', st.collected, MONEY], ['Still owed', st.owed, MONEY],
    ['Average order', st.average, MONEY], ['Pickup / Delivery', `${st.pickup} / ${st.delivery}`, '@'],
    ['Zelle', st.zelle, MONEY], ['Cash', st.cash, MONEY], ['Card', st.card, MONEY],
  ];
  stats.forEach(([label, val, nf], i) => {
    const row = 3 + i;
    const a = ws.getCell(`B${row}`);
    const b = ws.getCell(`C${row}`);
    a.value = label;
    b.value = val;
    b.numFmt = nf;
    b.alignment = { horizontal: 'left' };
    const strong = label === 'TOTAL SALES';
    a.font = { name: FONT, size: 11, bold: strong, color: { argb: 'FF1A1714' } };
    b.font = { name: FONT, size: 11, bold: strong, color: { argb: strong ? BRAND.red : 'FF1A1714' } };
    a.border = { bottom: { style: 'thin', color: { argb: BRAND.line } } };
    b.border = a.border;
  });

  const hdr = 3 + stats.length + 1;
  ['Order #', 'Customer', 'Items', 'Meals', 'Lbs', 'Total', 'Paid', 'Payment', 'Pickup / Delivery', 'Status'].forEach((h, i) => {
    const c = ws.getRow(hdr).getCell(i + 1);
    c.value = h;
    c.font = { name: FONT, size: 10, bold: true, color: { argb: BRAND.cream } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ink } };
    c.alignment = { vertical: 'middle', horizontal: i === 2 || i === 1 ? 'left' : 'center', wrapText: true };
    c.border = { bottom: { style: 'medium', color: { argb: BRAND.red } } };
  });
  ws.getRow(hdr).height = 26;

  const sorted = [...(orders || [])].sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
  sorted.forEach((o, i) => {
    const v = rowValues(o);
    const r = ws.getRow(hdr + 1 + i);
    [v.no, v.name, v.items, v.meals, v.lbs, v.total, v.paid, v.pay, v.how, v.status].forEach((val, ci) => {
      const c = r.getCell(ci + 1);
      c.value = val;
      c.font = { name: FONT, size: 10, color: { argb: v.status === 'Cancelled' ? 'FF999999' : 'FF1A1714' } };
      c.alignment = { vertical: 'top', horizontal: ci === 1 || ci === 2 ? 'left' : ci === 5 ? 'right' : 'center', wrapText: ci === 1 || ci === 2 };
      c.border = { bottom: { style: 'thin', color: { argb: BRAND.line } } };
    });
    r.getCell(5).numFmt = '0.0;-0.0;"–"';
    r.getCell(6).numFmt = MONEY;
    r.height = Math.max(16, 14 * String(v.items || '').split('\n').length);
  });
  return ws;
}

// All orders (any week) → the report workbook for the week starting `start` (a Monday).
export async function buildWeeklyReportWorkbook(allOrders, start) {
  const end = addDays(start, 6);
  const inWeek = (allOrders || []).filter((o) => o.cook_date >= start && o.cook_date <= end);
  const wb = await buildOrdersWorkbook(inWeek, { week: end, label: weekLabel(start) });
  const buckets = new Map();
  for (const o of allOrders || []) {
    if (!o.cook_date) continue;
    const mon = mondayOf(o.cook_date);
    if (mon > start) continue; // weeks after the reported one aren't finished yet
    if (!buckets.has(mon)) buckets.set(mon, []);
    buckets.get(mon).push(o);
  }
  if (!buckets.has(start)) buckets.set(start, []);
  for (const mon of [...buckets.keys()].sort()) addWeekSheet(wb, mon, buckets.get(mon));
  return { wb, stats: weekStats(inWeek), weekCount: buckets.size };
}

const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export function reportEmail(start, stats) {
  const label = weekLabel(start);
  const rows = [
    ['Orders', stats.orders + (stats.cancelled ? ` (+${stats.cancelled} cancelled)` : '')],
    ['Meals', stats.meals], ['Lbs', stats.lbs],
    ...(stats.discounts ? [['Promo discounts', `−${usd(stats.discounts)}`]] : []),
    ['Total sales', usd(stats.sales)], ['Collected (paid)', usd(stats.collected)], ['Still owed', usd(stats.owed)],
    ['Average order', usd(stats.average)], ['Pickup / Delivery', `${stats.pickup} / ${stats.delivery}`],
    ['Zelle / Cash / Card', `${usd(stats.zelle)} / ${usd(stats.cash)} / ${usd(stats.card)}`],
  ];
  const subject = `DinoMeals weekly report · ${label.replace('Mon ', '').replace(' – Sun ', ' – ')} · ${usd(stats.sales)}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1a1714">
<h2 style="margin:0 0 4px">🦖 DinoMeals weekly report</h2>
<p style="margin:0 0 14px;color:#6b6150">${label}</p>
<table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #e4ddd2">${k}</td><td style="padding:6px 0;border-bottom:1px solid #e4ddd2;text-align:right"><b>${v}</b></td></tr>`).join('')}</table>
<p style="margin:14px 0 0;color:#6b6150;font-size:13px">The attached Excel file has this week's orders and summary, plus a tab for every week so far. A new tab is added each Monday.</p></div>`;
  const text = `DinoMeals weekly report\n${label}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nExcel attached: this week's orders + summary, plus a tab for every week so far.`;
  return { subject, html, text };
}

export function reportFilename(start) {
  return `dinomeals-weekly-report-${start}.xlsx`;
}

// Builds + emails the report. deps are injectable for tests.
export async function runWeeklyReport({ start, listOrders, send }) {
  const orders = await listOrders();
  const { wb, stats, weekCount } = await buildWeeklyReportWorkbook(orders, start);
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const mail = reportEmail(start, stats);
  const res = await send({ ...mail, attachments: [{ filename: reportFilename(start), content: buf }] });
  return { ...res, stats, weekCount, bytes: buf.length };
}
