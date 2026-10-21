// Printable meal labels for one order, as a Word file (.docx).
// Sheet: Premium Label Supply PLS504 (Avery-style 3" x 2", 10 per 8.5" x 11" sheet,
// 2 across x 5 down). One label per meal, one per pound for by-the-lb items, one per
// extra portion. Macros come from the same saved numbers the order page shows.
import {
  Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, ImageRun,
  WidthType, HeightRule, BorderStyle, VerticalAlign, AlignmentType, TableLayoutType,
} from 'docx';
import { byId, nameOf, proteinLabel, mealLineCount, mealOz, PORTIONS, CARBS, VEGGIES, NONE, allergensFor, ALLERGEN_LABELS } from './menu.js';
import { mealMacros } from './orderForm.js';
import { LABEL_LOGO_PNG_BASE64, LABEL_LOGO_SIZE } from './labelLogo.js';
import { nextStart } from './labelSpots.js';

export const BEST_BY_DAYS = 6; // cook day + 6 (Sun cook -> best by Sat), matches Juan's labels

const IN = 1440; // twips per inch
const SHEET = { cols: 2, rows: 5, w: 3 * IN, h: 2 * IN, gap: 0.5 * IN, top: 0.5 * IN, side: 1 * IN };
const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER, insideHorizontal: NONE_BORDER, insideVertical: NONE_BORDER };
const FONT = 'Calibri';

const r = (n) => Math.round(Number(n) || 0);
const fmtDate = (d) => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`;

export function bestByDate(cookDate, days = BEST_BY_DAYS) {
  const [y, m, d] = String(cookDate || '').split('-').map(Number);
  if (!y) return '';
  return fmtDate(new Date(Date.UTC(y, m - 1, d + days, 12)));
}

const listFor = (kind) => (kind === 'carb' ? CARBS : VEGGIES);
const allergenText = (keys, map) => allergensFor(keys.filter(Boolean), map).map((a) => ALLERGEN_LABELS[a]?.en || a).join(', ');

// Turns an order into a flat list of label contents (pure; tested).
export function orderLabels(order, settings = {}) {
  const macros = settings.macros || {};
  const allergens = settings.allergens;
  const bestBy = bestByDate(order.cook_date);
  const who = `#${order.order_no || ''} · ${order.customer_name || ''}`.trim();
  const out = [];
  for (const l of order.items || []) {
    if (l.type === 'meal') {
      const n = mealLineCount(l);
      const oz = mealOz(l);
      const sides = [l.carb, l.veg].filter((x) => x && x !== NONE);
      const mm = mealMacros(l, macros);
      const label = {
        title: proteinLabel(l.protein, l.flavor, 'en'),
        sub: sides.map((id) => nameOf(byId(CARBS, id) || byId(VEGGIES, id), 'en')).join(' + '),
        serving: [`${oz.protein}oz`, l.carb !== NONE && `${oz.carb}oz`, l.veg !== NONE && `${oz.veg}oz`].filter(Boolean).join(' / ') + ' meal',
        macros: mm,
        weight: null,
        contains: allergenText([l.protein, `${l.protein}:${l.flavor}`, l.carb, l.veg], allergens),
        bestBy, who,
      };
      for (let i = 0; i < n; i++) out.push(label);
    } else if (l.type === 'lb' || l.type === 'extra') {
      const kind = l.kind;
      const isProtein = kind === 'protein';
      const title = isProtein ? proteinLabel(l.item, l.flavor, 'en', true) : nameOf(byId(listFor(kind), l.item), 'en');
      const m = (isProtein && macros[`${l.item}:${l.flavor}`]) || macros[l.item];
      const label = {
        title: l.type === 'extra' ? `Extra ${title}` : title,
        sub: '',
        serving: `${PORTIONS[kind] || 4}oz. Serving`,
        macros: m && m.cal != null && m.cal !== '' ? { cal: +m.cal, p: +m.p || 0, c: +m.c || 0, f: +m.f || 0 } : null,
        contains: allergenText(isProtein ? [l.item, `${l.item}:${l.flavor}`] : [l.item], allergens),
        bestBy, who,
      };
      if (l.type === 'extra') {
        for (let i = 0; i < (Number(l.qty) || 0); i++) out.push({ ...label, weight: null });
      } else {
        const lbs = Number(l.lbs) || 0;
        for (let i = 0; i < Math.floor(lbs); i++) out.push({ ...label, weight: '1 Lb.' });
        if (lbs % 1) out.push({ ...label, weight: '½ Lb.' });
      }
    }
  }
  return out.map((x, i) => ({ ...x, n: i + 1, of: out.length }));
}

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 17, bold: !!o.bold, color: o.color || '000000', italics: !!o.italics });
const para = (children, o = {}) => new Paragraph({ children, alignment: o.align, spacing: { before: 0, after: o.after || 0, line: o.line || 228 }, keepLines: true });

function labelCell(lb) {
  const width = SHEET.w;
  if (!lb) return new TableCell({ width: { size: width, type: WidthType.DXA }, borders: NO_BORDERS, children: [para([])] });
  const m = lb.macros;
  const info = [
    para([run(lb.serving, { bold: true })]),
    ...(m
      ? [para([run(`Cal. ${r(m.cal)}`)]), para([run(`${r(m.p)}g Protein. ${r(m.f)}g Fat.`)]), para([run(`${r(m.c)}g carbs.`)])]
      : [para([run('Macros: ask Juan', { italics: true })])]),
    ...(lb.weight ? [para([run(lb.weight, { bold: true, size: 21 })])] : []),
    ...(lb.contains ? [para([run(`Contains: ${lb.contains}`, { size: 14, bold: true })])] : []),
    para([run(`Best by date ${lb.bestBy}`, { bold: true })]),
  ];
  const logoW = 0.78 * IN;
  const inner = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: width - 0.3 * IN, type: WidthType.DXA },
    columnWidths: [logoW, width - 0.3 * IN - logoW],
    borders: NO_BORDERS,
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: logoW, type: WidthType.DXA }, borders: NO_BORDERS, verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: Buffer.from(LABEL_LOGO_PNG_BASE64, 'base64'),
          transformation: { width: 52, height: Math.round(52 * LABEL_LOGO_SIZE.h / LABEL_LOGO_SIZE.w) } })] })] }),
      new TableCell({ borders: NO_BORDERS, verticalAlign: VerticalAlign.CENTER, margins: { left: 60 }, children: info }),
    ] })],
  });
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    margins: { left: 0.15 * IN, right: 0.15 * IN, top: 40, bottom: 0 },
    children: [
      para([run(lb.title, { bold: true, size: lb.title.length > 30 ? 19 : 22 })], { align: AlignmentType.CENTER }),
      ...(lb.sub ? [para([run(lb.sub, { size: 16 })], { align: AlignmentType.CENTER })] : []),
      para([run('', { size: 6 })], { line: 120 }),
      inner,
      para([run(`${lb.who} · ${lb.n} of ${lb.of}`, { size: 12, color: '555555' })], { align: AlignmentType.RIGHT }),
    ],
  });
}

// `orders`: one order or a list (a whole cook day prints back to back).
// `start`: first empty spot on the sheet (1-10, left to right, top to bottom); earlier
// spots are skipped so a partly used sheet can be finished before starting a new one.
export async function buildLabelsDocx(orders, settings = {}, { start = 1 } = {}) {
  const list = Array.isArray(orders) ? orders : [orders];
  const perPage = SHEET.cols * SHEET.rows;
  const skip = Math.max(0, Math.min(perPage, Math.floor(Number(start) || 1)) - 1);
  const printed = list.flatMap((o) => orderLabels(o, settings));
  const labels = [...Array(skip).fill(null), ...printed];
  const rows = [];
  for (let i = 0; i < Math.max(labels.length, 1); i += SHEET.cols) {
    rows.push(new TableRow({
      height: { value: SHEET.h, rule: HeightRule.EXACT },
      cantSplit: true,
      children: [
        labelCell(labels[i]),
        new TableCell({ width: { size: SHEET.gap, type: WidthType.DXA }, borders: NO_BORDERS, children: [para([])] }),
        labelCell(labels[i + 1]),
      ],
    }));
  }
  // One table per sheet so every page starts exactly at the top margin.
  const sheets = [];
  for (let i = 0; i < rows.length; i += SHEET.rows) {
    sheets.push(new Table({
      layout: TableLayoutType.FIXED,
      width: { size: SHEET.w * 2 + SHEET.gap, type: WidthType.DXA },
      columnWidths: [SHEET.w, SHEET.gap, SHEET.w],
      borders: NO_BORDERS,
      rows: rows.slice(i, i + SHEET.rows),
    }));
  }
  // Each sheet is its own section, so every page starts exactly at the top margin.
  const doc = new Document({
    creator: 'DinoMeals',
    title: list.length === 1 ? `DinoMeals labels #${list[0].order_no || ''}` : `DinoMeals labels ${list[0]?.cook_date || ''}`,
    sections: sheets.map((t) => ({
      properties: { page: { size: { width: 8.5 * IN, height: 11 * IN }, margin: { top: SHEET.top, bottom: 0, left: SHEET.side, right: SHEET.side, header: 0, footer: 0 } } },
      children: [t, new Paragraph({ spacing: { before: 0, after: 0, line: 20 }, children: [run('', { size: 2 })] })],
    })),
  });
  return { buffer: await Packer.toBuffer(doc), count: printed.length, sheets: sheets.length, perPage, next: nextStart(skip + 1, printed.length) };
}
