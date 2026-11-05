import { insertOrder, listOrders, updateOrder, deleteOrder, getOrder, getSettings } from '../../../lib/db';
import { isValidSession } from '../../../lib/adminSession';
import { rateLimit } from '../../../lib/rateLimit';
import { notifyNewOrder } from '../../../lib/push';
import { buildOrderRow, repriceOrder, normalizePhone, PAY, STATUSES, clean } from '../../../lib/orderRow';
import { sendOrderText } from '../../../lib/sms';
import { upsertReminder } from '../../../lib/db';
import { publicOrder } from '../../../lib/orderView';
import { cleanLabelLines } from '../../../lib/labelSpots';
import { promoDiscount } from '../../../lib/promo';
import { PICK_MIN, PICK_MAX } from '../../../lib/loyalty';
import { allDiscounts } from '../../../lib/referral';

// Sends one order-status text (if the customer opted in and texts are switched on)
// and records it on the order so it never sends twice. Capped at 5s; never throws.
async function textCustomer(kind, order, settings) {
  try {
    const sent = await Promise.race([sendOrderText(kind, order, settings), new Promise((r) => setTimeout(() => r(null), 5500))]);
    if (sent) await updateOrder(order.id, { sms_sent: sent });
  } catch (e) {
    console.error('textCustomer', kind, e?.message);
  }
}

export default async function handler(req, res) {
  try {
    const admin = isValidSession(req);

    if (req.method === 'POST') {
      if (!admin && !rateLimit(req, 'order', 10, 10 * 60 * 1000)) return res.status(429).json({ error: 'rate_limited' });
      const wantAdmin = !!req.body?.as_admin;
      if (wantAdmin && !admin) return res.status(401).json({ error: 'Not logged in' });
      const built = await buildOrderRow(req.body || {}, { admin: wantAdmin });
      if (built.error) return res.status(400).json(built);
      const order = await insertOrder(built.row);
      // Ping the owner's devices; capped at 3s so a slow push service never delays the customer.
      if (!wantAdmin) await Promise.race([notifyNewOrder(order), new Promise((r) => setTimeout(r, 3000))]);
      if (!wantAdmin) await textCustomer('confirm', order, await getSettings());
      if (!wantAdmin && built.row.reminder_opt_in) {
        await upsertReminder({ digits: built.row.phone_digits, name: built.row.customer_name, lang: built.row.lang }).catch((e) => console.error('reminder opt-in', e?.message));
      }
      // Public receipt fields + the private order-page code (never name/phone/address).
      return res.status(200).json({ order: { id: order.id, ...publicOrder(order), ref_code: built.ref.code }, loyalty: built.loyalty, ref_note: built.ref.note });
    }

    if (!admin) return res.status(401).json({ error: 'Not logged in' });

    if (req.method === 'GET') {
      const orders = await listOrders({ cookDate: req.query.week || undefined });
      return res.status(200).json({ orders });
    }

    if (req.method === 'PATCH') {
      const { id, ...p } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const cur = await getOrder(id);
      if (!cur) return res.status(404).json({ error: 'Not found' });
      const patch = {};
      if ('status' in p && STATUSES.includes(p.status)) patch.status = p.status;
      if ('paid' in p) {
        patch.paid = !!p.paid;
        patch.paid_at = p.paid ? new Date().toISOString() : null;
      }
      if ('payment_method' in p && PAY.includes(p.payment_method)) patch.payment_method = p.payment_method;
      if ('notes' in p) patch.notes = clean(p.notes, 800);
      if ('cook_date' in p && /^\d{4}-\d{2}-\d{2}$/.test(p.cook_date)) patch.cook_date = p.cook_date;
      if ('route_pos' in p) patch.route_pos = p.route_pos == null ? null : parseInt(p.route_pos, 10);
      if ('fulfillment' in p && ['pickup', 'delivery'].includes(p.fulfillment)) patch.fulfillment = p.fulfillment;
      if ('address' in p) patch.address = clean(p.address, 200);
      if ('zip' in p) patch.zip = clean(p.zip, 10).replace(/[^\d]/g, '').slice(0, 5);
      // Full order edit (admin "Edit" button): contact details + items.
      if ('customer_name' in p) {
        const n = clean(p.customer_name, 80);
        if (!n) return res.status(400).json({ error: 'name_required' });
        patch.customer_name = n;
      }
      if ('phone' in p) {
        const d = normalizePhone(p.phone);
        if (d.length !== 10) return res.status(400).json({ error: 'phone_required' });
        patch.phone = clean(p.phone, 30);
        patch.phone_digits = d;
      }
      if ('email' in p) patch.email = clean(p.email, 120);
      if ('delivery_notes' in p) patch.delivery_notes = clean(p.delivery_notes, 300);
      if ('allergy_notes' in p) patch.allergy_notes = clean(p.allergy_notes, 500);
      if ('custom_request' in p) patch.custom_request = clean(p.custom_request, 1500);
      // Label editor for custom orders: the meals to print labels for (doesn't change the price).
      if ('label_lines' in p) patch.label_lines = cleanLabelLines(p.label_lines);
      if (patch.fulfillment === 'delivery' || (!patch.fulfillment && cur.fulfillment === 'delivery')) {
        const addr = 'address' in patch ? patch.address : cur.address;
        const zip = 'zip' in patch ? patch.zip : cur.zip;
        if (('address' in p || 'zip' in p || patch.fulfillment) && (!addr || zip.length !== 5)) {
          return res.status(400).json({ error: 'address_required' });
        }
      }
      if (patch.fulfillment === 'pickup') {
        patch.address = '';
        patch.zip = '';
      }

      // Money: re-price when items change; otherwise just move the card fee
      // when the payment method switches. A hand-typed total always wins.
      const settings = await getSettings({ fresh: true });
      // Loyalty "bonus" reward (25th, 30th… order): Juan picks 5–10% on the order card.
      let curM = cur;
      if ('reward_pick' in p && cur.reward && cur.reward.kind === 'pick') {
        const n = Math.min(PICK_MAX, Math.max(PICK_MIN, parseInt(p.reward_pick, 10) || PICK_MIN));
        curM = { ...cur, reward: { ...cur.reward, value: n, picked: true } };
        patch.reward = curM.reward;
      }
      const touchesMoney = 'cart' in p || patch.payment_method || patch.fulfillment || 'reward_pick' in p;
      if ('total' in p) {
        patch.total = p.total === '' || p.total == null ? null : Math.max(0, Number(p.total) || 0);
        // Custom quote that saved a promo code and/or loyalty reward at checkout: the typed price is
        // before the discount, so both come off automatically (shows on the receipt and export).
        if ((curM.promo || curM.reward || curM.referral || curM.ref_credit) && !(curM.items || []).length && !('cart' in p)) {
          const sub = patch.total == null ? 0 : Math.round(patch.total * 100) / 100;
          const st = allDiscounts(sub, { promoDisc: curM.promo ? promoDiscount(curM.promo, sub) : 0, reward: curM.reward, refPct: curM.referral ? curM.referral.pct : 0, creditPct: curM.ref_credit ? curM.ref_credit.pct : 0 }, settings);
          Object.assign(patch,
            patch.total == null ? { subtotal: null, discount: 0 } : { subtotal: sub, discount: st.total, total: Math.round((sub - st.total) * 100) / 100 },
            curM.reward ? { reward: { ...curM.reward, discount: st.reward } } : {},
            curM.referral ? { referral: { ...curM.referral, discount: st.referral } } : {},
            curM.ref_credit ? { ref_credit: { ...curM.ref_credit, discount: st.credit } } : {});
        }
      } else if (touchesMoney) {
        const r = repriceOrder(curM, patch, settings, 'cart' in p ? p.cart : null);
        if (r.error) return res.status(400).json({ error: r.error });
        Object.assign(patch, r.patch);
      }
      const wasPaid = !!cur.paid;
      const wasStatus = cur.status;
      const order = await updateOrder(id, patch);
      // Order-status texts: "payment received" when it flips to paid, "ready" when marked ready.
      if (patch.paid === true && !wasPaid) await textCustomer('paid', order, settings);
      if (patch.status === 'ready' && wasStatus !== 'ready') await textCustomer('ready', order, settings);
      return res.status(200).json({ order });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await deleteOrder(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
