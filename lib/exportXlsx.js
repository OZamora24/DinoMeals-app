import ExcelJS from 'exceljs';
import { lineLabel, DIET_FLAGS } from './menu';
import { LOGO_BADGE_PNG_BASE64 } from './exportLogo';

// Admin export: a formatted Excel workbook of a cook week's orders.
//   Sheet "Orders"  – one row per order, every column sized + wrapped so it all fits,
//                     a live TOTAL row under the last order (SUM formulas).
//   Sheet "Summary" – week totals (revenue, collected, owed, meals, lbs, pickup vs
//                     delivery, by payment method). All formulas read the Orders sheet,
//                     so edits there (marking paid, inserting an order) update it.

const BRAND = { ink: 'FF141110', red: 'FFE2372D', cream: 'FFF6EFE3', line: 'FFE4DDD2', zebra: 'FFFBF8F3', muted: 'FF6B6150' };
const FONT = 'Arial';
const HEADER_ROW = 4;
const FIRST = HEADER_ROW + 1;

const COLS = [
  { key: 'no', header: 'Order #', width: 9, align: 'center' },
  { key: 'cook', header: 'Cook day', width: 13, fmt: 'ddd, mmm d', align: 'center' },
  { key: 'placed', header: 'Placed', width: 17, fmt: 'ddd m/d  h:mm AM/PM', align: 'center' },
  { key: 'name', header: 'Customer', width: 20, wrap: true },
  { key: 'phone', header: 'Phone', width: 15, align: 'center' },
  { key: 'email', header: 'Email', width: 28, wrap: true },
  { key: 'items', header: 'Items', width: 62, wrap: true },
  { key: 'meals', header: 'Meals', width: 8, fmt: '0;-0;"–"', align: 'center', sum: true },
  { key: 'lbs', header: 'Lbs', width: 8, fmt: '0.0;-0.0;"–"', align: 'center', sum: true },
  { key: 'subtotal', header: 'Subtotal', width: 12, fmt: '$#,##0.00;-$#,##0.00;"–"', sum: true, align: 'right' },
  { key: 'fee', header: 'Delivery fee', width: 12, fmt: '$#,##0.00;-$#,##0.00;"–"', sum: true, align: 'right' },
  { key: 'total', header: 'Total', width: 12, fmt: '$#,##0.00;-$#,##0.00;"–"', sum: true, bold: true, align: 'right' },
  { key: 'how', header: 'Pickup / Delivery', width: 14, align: 'center' },
  { key: 'address', header: 'Address & drop-off notes', width: 32, wrap: true },
  { key: 'pay', header: 'Payment', width: 10, align: 'center' },
  { key: 'paid', header: 'Paid', width: 8, align: 'center' },
  { key: 'status', header: 'Status', width: 12, align: 'center' },
  { key: 'diet', header: 'Diet & allergies', width: 26, wrap: true },
  { key: 'notes', header: 'Notes', width: 30, wrap: true },
  { key: 'custom', header: 'Custom request', width: 30, wrap: true },
  { key: 'source', header: 'Source', width: 9, align: 'center' },
];
const colLetter = (key) => String.fromCharCode(65 + COLS.findIndex((c) => c.key === key));

const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
const money = (n) => `$${Number(n || 0).toFixed(0)}`;
const ymdToDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
// Excel has no time zones: write Los Angeles wall-clock time as a "UTC" date.
const laDate = (iso) => {
  if (!iso) return null;
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute));
};

function rowValues(o) {
  const items = (o.items || []).map((l) =>
    l.type === 'meal' ? `${l.count} × ${lineLabel(l)}  (${money(l.total)})` : `${l.lbs} lb ${lineLabel(l)}  (${money(l.total)})`,
  );
  const diet = (o.diet || []).map((id) => (DIET_FLAGS.find((d) => d.id === id) || {}).en || id);
  if (o.allergy_notes) diet.push(o.allergy_notes);
  const addr = o.fulfillment === 'delivery' ? [[o.address, o.zip].filter(Boolean).join(', '), o.delivery_notes].filter(Boolean).join('\n') : '';
  return {
    no: o.order_no,
    cook: ymdToDate(o.cook_date),
    placed: laDate(o.created_at),
    name: o.customer_name || '',
    phone: o.phone || '',
    email: o.email || '',
    items: items.join('\n') || (o.custom_request ? 'Custom — see request' : ''),
    meals: Number(o.meal_count) || 0,
    lbs: Number(o.lb_total) || 0,
    subtotal: o.subtotal == null ? null : Number(o.subtotal),
    fee: Number(o.delivery_fee) || 0,
    total: o.total == null ? null : Number(o.total),
    how: cap(o.fulfillment),
    address: addr,
    pay: cap(o.payment_method),
    paid: o.paid ? 'Yes' : 'No',
    status: cap(o.status),
    diet: diet.join('\n'),
    notes: o.notes || '',
    custom: o.custom_request || '',
    source: o.source === 'dm' ? 'DM' : cap(o.source),
  };
}

// rough line count so wrapped rows open at the right height (Excel won't auto-fit on open)
function linesFor(v, width) {
  if (!v) return 1;
  const perLine = Math.max(4, Math.floor(width * 1.05));
  return String(v).split('\n').reduce((n, part) => n + Math.max(1, Math.ceil(part.length / perLine)), 0);
}

const thin = { style: 'thin', color: { argb: BRAND.line } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

export async function buildOrdersWorkbook(orders, { week, label } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DinoMeals';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true; // Excel/Sheets compute every formula when the file opens
  const ws = wb.addWorksheet('Orders', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: HEADER_ROW, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 1, margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    headerFooter: { oddFooter: '&L&8DinoMeals orders&R&8Page &P of &N' },
  });
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));
  const last = String.fromCharCode(64 + COLS.length);

  const logo = wb.addImage({ base64: LOGO_BADGE_PNG_BASE64, extension: 'png' });

  // ---- title block: badge in A1, title beside it ----
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ink } };
  ws.addImage(logo, { tl: { col: 0.14, row: 0.1 }, ext: { width: 44, height: 44 }, editAs: 'oneCell' });
  ws.mergeCells(`B1:${last}1`);
  const t = ws.getCell('B1');
  t.value = { richText: [{ text: 'DINO ', font: { name: FONT, size: 18, bold: true, color: { argb: BRAND.red } } }, { text: 'MEALS  ·  ORDERS', font: { name: FONT, size: 18, bold: true, color: { argb: BRAND.cream } } }] };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ink } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 40;
  ws.mergeCells(`A2:${last}2`);
  const s = ws.getCell('A2');
  const exported = laDate(new Date().toISOString());
  s.value = `${label || (week ? `Cook day ${week}` : 'All orders')}   ·   Exported ${exported.toISOString().slice(0, 10)} ${exported.toISOString().slice(11, 16)} (Pacific)   ·   Totals are on the last row and on the Summary tab`;
  s.font = { name: FONT, size: 9, color: { argb: BRAND.muted }, italic: true };
  s.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 6;

  // ---- header ----
  const hr = ws.getRow(HEADER_ROW);
  COLS.forEach((c, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: BRAND.cream } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ink } };
    cell.alignment = { vertical: 'middle', horizontal: c.align || 'left', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: BRAND.red } } };
  });
  hr.height = 30;

  // ---- orders (oldest first, like a ledger) ----
  const sorted = [...orders].sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
  sorted.forEach((o, idx) => {
    const v = rowValues(o);
    const row = ws.getRow(FIRST + idx);
    let lines = 1;
    COLS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v[c.key] ?? null;
      cell.font = { name: FONT, size: 10, bold: !!c.bold, color: { argb: o.status === 'cancelled' ? 'FF9A9184' : 'FF1A1714' }, strike: o.status === 'cancelled' && c.key === 'total' };
      cell.alignment = { vertical: 'top', horizontal: c.align || 'left', wrapText: !!c.wrap };
      if (c.fmt) cell.numFmt = c.fmt;
      cell.border = box;
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.zebra } };
      if (c.wrap) lines = Math.max(lines, linesFor(v[c.key], c.width));
    });
    row.height = Math.max(20, 14 * lines + 6);
  });

  const lastData = FIRST + Math.max(sorted.length, 1) - 1;
  // A thin spacer row sits inside every total range, so a row inserted right
  // above TOTAL is still counted (Excel grows a range when you insert inside it).
  const spacer = lastData + 1;
  ws.getRow(spacer).height = 5;
  const END = spacer;
  // ---- live TOTAL row ----
  const totalRow = spacer + 1;
  const tr = ws.getRow(totalRow);
  COLS.forEach((c, i) => {
    const cell = tr.getCell(i + 1);
    const L = String.fromCharCode(65 + i);
    if (i === 0) cell.value = 'TOTAL';
    else if (c.key === 'name') cell.value = { formula: `COUNTIFS(A${FIRST}:A${END},"<>",${colLetter('status')}${FIRST}:${colLetter('status')}${END},"<>Cancelled")&" orders"` };
    else if (c.sum) cell.value = { formula: `SUMIFS(${L}${FIRST}:${L}${END},${colLetter('status')}${FIRST}:${colLetter('status')}${END},"<>Cancelled")` };
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: BRAND.cream } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ink } };
    cell.border = { top: { style: 'medium', color: { argb: BRAND.red } } };
    cell.alignment = { vertical: 'middle', horizontal: c.align || (c.sum ? 'right' : 'left') };
    if (c.fmt) cell.numFmt = c.fmt;
  });
  tr.height = 24;
  const note = ws.getCell(`A${totalRow + 1}`);
  note.value = 'Adding an order by hand? Insert a row above TOTAL and the totals + Summary update automatically. Cancelled orders are not counted.';
  note.font = { name: FONT, size: 8, italic: true, color: { argb: BRAND.muted } };

  // ---- dropdowns + colors for Paid / Status ----
  const P = colLetter('paid'), S = colLetter('status');
  for (let r = FIRST; r <= lastData; r++) {
    ws.getCell(`${P}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Yes,No"'] };
    ws.getCell(`${S}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"New,Quote,Confirmed,Cooking,Ready,Done,Cancelled"'] };
  }
  const fill = (argb) => ({ type: 'pattern', pattern: 'solid', bgColor: { argb } });
  ws.addConditionalFormatting({ ref: `${P}${FIRST}:${P}${lastData}`, rules: [
    { type: 'cellIs', operator: 'equal', formulae: ['"Yes"'], style: { fill: fill('FFD9F2E1'), font: { color: { argb: 'FF1E7A44' }, bold: true } }, priority: 1 },
    { type: 'cellIs', operator: 'equal', formulae: ['"No"'], style: { fill: fill('FFFBE0DD'), font: { color: { argb: 'FFB3261E' }, bold: true } }, priority: 2 },
  ] });
  ws.addConditionalFormatting({ ref: `${S}${FIRST}:${S}${lastData}`, rules: [
    { type: 'cellIs', operator: 'equal', formulae: ['"New"'], style: { fill: fill('FFFFF1D6'), font: { color: { argb: 'FF8A5A00' } } }, priority: 3 },
    { type: 'cellIs', operator: 'equal', formulae: ['"Done"'], style: { fill: fill('FFE6E6E6'), font: { color: { argb: 'FF555555' } } }, priority: 4 },
    { type: 'cellIs', operator: 'equal', formulae: ['"Cancelled"'], style: { fill: fill('FFEFEFEF'), font: { color: { argb: 'FF999999' }, strike: true } }, priority: 5 },
    { type: 'cellIs', operator: 'equal', formulae: ['"Ready"'], style: { fill: fill('FFD9F2E1'), font: { color: { argb: 'FF1E7A44' } } }, priority: 6 },
  ] });
  ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: lastData, column: COLS.length } };

  // ---- Summary sheet ----
  const sm = wb.addWorksheet('Summary', { views: [{ showGridLines: false }], pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 1 } });
  sm.columns = [{ width: 3 }, { width: 30 }, { width: 18 }, { width: 3 }, { width: 46 }];
  sm.mergeCells('B1:E1');
  const st = sm.getCell('B1');
  st.value = { richText: [{ text: 'DINO ', font: { name: FONT, size: 16, bold: true, color: { argb: BRAND.red } } }, { text: 'MEALS  ·  WEEK TOTALS', font: { name: FONT, size: 16, bold: true, color: { argb: BRAND.ink } } }] };
  sm.getRow(1).height = 30;
  sm.addImage(logo, { tl: { col: 4.6, row: 0.2 }, ext: { width: 96, height: 96 }, editAs: 'oneCell' });
  sm.getCell('B2').value = label || (week ? `Cook day ${week}` : 'All orders');
  sm.getCell('B2').font = { name: FONT, size: 10, italic: true, color: { argb: BRAND.muted } };

  const R = (k) => `Orders!$${colLetter(k)}$${FIRST}:$${colLetter(k)}$${END}`;
  const live = `${R('status')},"<>Cancelled"`;
  const lines = [
    ['ORDERS', null],
    ['Orders (not cancelled)', `COUNTIFS(${R('no')},"<>",${live})`, '0'],
    ['Cancelled', `COUNTIFS(${R('status')},"Cancelled")`, '0'],
    ['Meals to cook', `SUMIFS(${R('meals')},${live})`, '0'],
    ['Lbs to cook', `SUMIFS(${R('lbs')},${live})`, '0.0'],
    ['MONEY', null],
    ['Food subtotal', `SUMIFS(${R('subtotal')},${live})`, '$#,##0.00'],
    ['Delivery fees', `SUMIFS(${R('fee')},${live})`, '$#,##0.00'],
    ['Total sales', `SUMIFS(${R('total')},${live})`, '$#,##0.00', true],
    ['Collected (paid)', `SUMIFS(${R('total')},${R('paid')},"Yes",${live})`, '$#,##0.00'],
    ['Still owed', `C12-C13`, '$#,##0.00', true],
    ['Average order', `IFERROR(C12/COUNTIFS(${R('total')},">0",${live}),0)`, '$#,##0.00'],
    ['HOW THEY GET IT', null],
    ['Pickup orders', `COUNTIFS(${R('how')},"Pickup",${live})`, '0'],
    ['Delivery orders', `COUNTIFS(${R('how')},"Delivery",${live})`, '0'],
    ['PAYMENT METHOD (sales)', null],
    ['Zelle', `SUMIFS(${R('total')},${R('pay')},"Zelle",${live})`, '$#,##0.00'],
    ['Cash', `SUMIFS(${R('total')},${R('pay')},"Cash",${live})`, '$#,##0.00'],
    ['Card', `SUMIFS(${R('total')},${R('pay')},"Card",${live})`, '$#,##0.00'],
  ];
  lines.forEach(([labelText, formula, fmt, strong], i) => {
    const r = 4 + i;
    const a = sm.getCell(`B${r}`), b = sm.getCell(`C${r}`);
    a.value = labelText;
    if (!formula) {
      a.font = { name: FONT, size: 9, bold: true, color: { argb: BRAND.red } };
      sm.getRow(r).height = 22; a.alignment = { vertical: 'bottom' };
      a.border = { bottom: { style: 'thin', color: { argb: BRAND.red } } }; b.border = a.border;
      return;
    }
    b.value = { formula };
    b.numFmt = fmt;
    a.font = { name: FONT, size: 11, bold: !!strong, color: { argb: 'FF1A1714' } };
    b.font = { name: FONT, size: 11, bold: !!strong, color: { argb: strong ? BRAND.red : 'FF1A1714' } };
    b.alignment = { horizontal: 'right' };
    a.border = { bottom: thin }; b.border = { bottom: thin };
    sm.getRow(r).height = 20;
  });
  sm.getCell('E8').value = 'Every number here is a formula that reads the Orders tab — change a "Paid" cell to Yes and Collected / Still owed update on their own.';
  sm.getCell('E8').alignment = { wrapText: true, vertical: 'top' };
  sm.getCell('E8').font = { name: FONT, size: 9, italic: true, color: { argb: BRAND.muted } };
  sm.mergeCells('E8:E11');

  return wb;
}
