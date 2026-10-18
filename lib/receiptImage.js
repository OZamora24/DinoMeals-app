// Draws an order receipt onto a canvas and returns a PNG Blob (browser only).
// Used by the "Save receipt" button so customers can keep it in their photos.
import { lineLabel, ozTag, money, prettyDate } from './menu.js';
import { VIEW_TXT } from './orderView.js';

function loadImg(src) {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function wrap(ctx, text, max) {
  const words = String(text).split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

export async function receiptBlob(order, lang = 'en') {
  const x = VIEW_TXT[lang] || VIEW_TXT.en;
  const W = 720, P = 48, S = 2;
  try { await document.fonts?.ready; } catch {}
  const logo = await loadImg('/logo-mark.png');
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const sans = 'Manrope, system-ui, sans-serif';
  const disp = 'Anton, Impact, sans-serif';

  // Lay out rows first so the canvas can be sized to fit.
  ctx.font = `600 26px ${sans}`;
  const rows = (order.items || []).map((l) => {
    let q, name, sub;
    if (l.type === 'meal') {
      const [p, ...sides] = lineLabel(l, lang).split(' + ');
      q = `${l.count}×`; name = p; sub = [...sides, ozTag(l, lang)].filter(Boolean).join(' · ');
    } else if (l.type === 'extra') { q = `${l.qty}×`; name = lineLabel(l, lang); sub = x.extra; }
    else { q = `${l.lbs} lb`; name = lineLabel(l, lang); sub = ''; }
    ctx.font = `400 21px ${sans}`;
    const subLines = sub ? wrap(ctx, sub, W - P * 2 - 150) : [];
    return { q, name, subLines, price: l.total != null ? money(l.total) : '' };
  });
  const rowsH = rows.reduce((a, r) => a + 54 + r.subLines.length * 28, 0);
  const totLines = order.total == null ? 0 : order.delivery_fee > 0 ? 3 : 1;
  const H = 300 + rowsH + totLines * 46 + 120;

  c.width = W * S; c.height = H * S;
  ctx.scale(S, S);
  ctx.fillStyle = '#141010'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e2372d'; ctx.fillRect(0, 0, W, 10);

  let y = 48;
  if (logo) ctx.drawImage(logo, P, y, 64, 64);
  ctx.textBaseline = 'middle';
  ctx.font = `400 40px ${disp}`;
  ctx.fillStyle = '#e2372d'; ctx.fillText('DINO', P + 80, y + 33);
  const dw = ctx.measureText('DINO ').width;
  ctx.fillStyle = '#f6efe3'; ctx.fillText('MEALS', P + 80 + dw, y + 33);
  ctx.textAlign = 'right';
  ctx.font = `800 22px ${sans}`; ctx.fillStyle = '#a89a8e';
  ctx.fillText(order.fulfillment === 'delivery' ? x.delivery : x.pickup, W - P, y + 33);
  ctx.textAlign = 'left';

  y += 110;
  ctx.font = `400 46px ${disp}`; ctx.fillStyle = '#f6efe3';
  ctx.fillText(`${x.order.toUpperCase()} #${order.order_no}`, P, y);
  y += 44;
  ctx.font = `600 22px ${sans}`; ctx.fillStyle = '#a89a8e';
  ctx.fillText(`${x.cook_day} ${prettyDate(order.cook_date, lang)}`, P, y);
  y += 40;
  ctx.fillStyle = '#3a2f2a'; ctx.fillRect(P, y, W - P * 2, 2);
  y += 30;

  ctx.textBaseline = 'alphabetic';
  for (const r of rows) {
    y += 28;
    ctx.font = `800 26px ${sans}`; ctx.fillStyle = '#e2372d';
    ctx.fillText(r.q, P, y);
    const qw = ctx.measureText(`${r.q} `).width;
    ctx.fillStyle = '#f6efe3'; ctx.font = `700 26px ${sans}`;
    ctx.fillText(r.name, P + qw, y);
    ctx.textAlign = 'right'; ctx.font = `800 26px ${sans}`;
    ctx.fillText(r.price, W - P, y);
    ctx.textAlign = 'left';
    ctx.font = `400 21px ${sans}`; ctx.fillStyle = '#a89a8e';
    for (const s of r.subLines) { y += 28; ctx.fillText(s, P + qw, y); }
    y += 26;
  }

  if (order.total != null) {
    ctx.fillStyle = '#3a2f2a'; ctx.fillRect(P, y, W - P * 2, 2);
    y += 16;
    const tl = (label, val, big) => {
      y += big ? 46 : 36;
      ctx.font = big ? `400 36px ${disp}` : `600 22px ${sans}`;
      ctx.fillStyle = big ? '#f6efe3' : '#a89a8e';
      ctx.fillText(label, P, y);
      ctx.textAlign = 'right'; ctx.fillText(val, W - P, y); ctx.textAlign = 'left';
    };
    if (order.delivery_fee > 0) { tl(x.subtotal, money(order.subtotal)); tl(x.fee, money(order.delivery_fee)); }
    tl(x.total, money(order.total), true);
  }

  ctx.font = `600 20px ${sans}`; ctx.fillStyle = '#6f625a'; ctx.textAlign = 'center';
  ctx.fillText(`dinomeals.app/o/${order.token}`, W / 2, H - 40);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
