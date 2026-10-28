// Rex, the admin help pop-up. Answers questions about how the app works from
// lib/dinoGuide.js. Read-only: Rex can't change orders, settings or code.
//  - With ANTHROPIC_API_KEY set: Claude answers from the guide.
//  - Without it (demo mode) or if the AI is down: a simple search over the guide.
import { DINO_GUIDE, GUIDE_UPDATED } from './dinoGuide.js';

export const DEV_NAME = 'Orlando';
export const MAX_Q = 600; // characters per question
export const MAX_TURNS = 8; // earlier messages sent along for context

export function systemPrompt(guide = DINO_GUIDE) {
  return `You are Rex, the friendly dino helper inside the DinoMeals admin ("Kitchen") page. You help Juan Carlos, the owner, use the app.

Rules:
- Answer ONLY from the guide below. It describes how the app works today (last updated ${GUIDE_UPDATED}).
- If the guide doesn't cover it, or you're not sure, say so plainly and tell him to contact ${DEV_NAME}, the developer. Never guess or invent buttons, settings or features.
- You can't change anything: not orders, settings, prices or the app's code. Explain where to tap so he can do it himself. For things the guide says need the developer (menu items, prices, new features, errors, anything broken), tell him to contact ${DEV_NAME}.
- Keep answers short and practical: steps with the exact button names, 2-6 short lines. No code. Use plain text with simple "1." steps; no tables or headings.
- Answer in the language he writes in (English or Spanish).
- Never ask for or repeat passwords or payment details.
- Be warm and a little playful (an occasional 🦖 is fine), but clear first.

=== DINOMEALS APP GUIDE ===
${guide}`;
}

// ---- Offline answer: pick the guide passages that best match the question ----
const STOP = new Set('a an the and or to of in on for is it i my me do does how what when where can why with be this that are you your from at by as if not get up out so there their about which who will would should could into than then them they we our us its was were has have had just like make need want see use using today now please hi hey hello como que una uno el la los las de del en por para mi'.split(' '));
const words = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9$#]+/g) || [];
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');

// Spanish → English hints so Spanish questions still find passages.
const ES = { pagado: 'paid', pagada: 'paid', pagadas: 'paid', pago: 'paid', marco: 'mark', marcar: 'mark', pagar: 'paid', orden: 'order', ordenes: 'order', pedido: 'order', etiqueta: 'labels', etiquetas: 'labels', imprimir: 'print', precio: 'price', precios: 'price', agotado: 'sold out', cerrar: 'close', cerrado: 'closed', semana: 'week', entrega: 'delivery', recoger: 'pickup', cliente: 'customer', clientes: 'customer', mensaje: 'message', recordatorio: 'reminder', macros: 'macros', calorias: 'macros', cocinar: 'cook sheet', borrar: 'delete', cancelar: 'cancel', editar: 'edit', cotizacion: 'quote', sabor: 'flavor', menu: 'menu' };

export function guideChunks(guide = DINO_GUIDE) {
  const out = [];
  let h2 = '', h3 = '';
  let buf = [];
  const flush = (recipe = false) => {
    const text = buf.join('\n').trim();
    if (text && text !== '---') out.push({ title: [h2, h3].filter(Boolean).join(' › '), text, recipe });
    buf = [];
  };
  for (const line of guide.split('\n')) {
    if (/^## /.test(line)) { flush(); h2 = line.replace(/^## (\d+\.\s*)?/, ''); h3 = ''; continue; }
    if (/^### /.test(line)) { flush(); h3 = line.replace(/^### /, ''); continue; }
    if (/^# /.test(line)) continue;
    // Each how-to recipe ("**Mark an order paid**: ...") is its own short answer.
    if (/how-to/i.test(h2) && /^\*\*[^*]+\*\*:/.test(line)) { flush(); buf.push(line); flush(true); continue; }
    // Split big sections at bold sub-titles so answers stay short.
    if (/^\*\*[^*]+\*\*\s*$/.test(line.trim()) && buf.join('').length > 200) flush();
    buf.push(line);
  }
  flush();
  return out;
}

let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  const chunks = guideChunks().map((c) => {
    const head = c.recipe ? c.text.split(':')[0] : c.title;
    return { ...c, bag: new Set(words(`${c.title} ${c.text}`).map(stem)), head: new Set(words(head).map(stem)) };
  });
  const df = new Map();
  for (const c of chunks) for (const w of c.bag) df.set(w, (df.get(w) || 0) + 1);
  INDEX = { chunks, idf: (w) => Math.log(1 + chunks.length / (df.get(w) || chunks.length)) };
  return INDEX;
}

export function offlineAnswer(question) {
  const { chunks, idf } = index();
  const q = [...new Set(words(question).flatMap((w) => (ES[w] ? words(ES[w]) : [w])).filter((w) => !STOP.has(w)).map(stem))];
  if (!q.length) return null;
  const scored = chunks.map((c) => {
    let s = 0;
    let hit = 0;
    for (const w of q) if (c.bag.has(w)) { hit += 1; s += idf(w) * (c.head.has(w) ? 2.5 : 1); }
    if (hit / q.length < 0.5) s = 0; // most of the question's words must match
    if (c.recipe) s *= 1.4;
    return { c, s: s / Math.sqrt(1 + c.text.length / 1500) };
  }).sort((a, b) => b.s - a.s);
  const best = scored[0];
  if (!best || best.s < 1.6) return null;
  const picks = [best.c];
  const second = scored[1];
  if (second && second.s >= best.s * 0.85 && best.c.text.length + second.c.text.length < 1400) picks.push(second.c);
  return picks.map((c) => {
    const body = c.text.length > 1100 ? `${c.text.slice(0, 1100).replace(/\s+\S*$/, '')}…` : c.text;
    return c.recipe ? body : `${c.title}\n${body}`;
  }).join('\n\n');
}

export const NOT_SURE = `Hmm, I'm not sure about that one 🦖 I only know how the app works. Please contact ${DEV_NAME} (your developer) and he'll sort it out.`;

// Keeps the chat short and well-formed for the AI.
export function cleanMessages(list) {
  const msgs = (Array.isArray(list) ? list : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, m.role === 'user' ? MAX_Q : 2000) }))
    .slice(-MAX_TURNS * 2);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs.length && msgs[msgs.length - 1].role === 'user' ? msgs : [];
}
