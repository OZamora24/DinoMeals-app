// Server-side data layer. Uses Supabase when SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY are set; otherwise falls back to an in-memory
// DEMO store (seeded with sample orders) so the app can be previewed with
// zero setup. Demo data resets whenever the server restarts.
// Only import this from pages/api/* or getServerSideProps.
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_ALLERGENS, cookDateFor, priceCart } from './menu';

export const DEFAULT_SETTINGS = {
  ordering_open: true,
  announcement: '',
  sold_out: [],
  macros: {}, // { [itemId or 'protein:flavor']: { cal, p, c, f } } per meal portion
  allergens: DEFAULT_ALLERGENS,
  zelle_info: '',
  cash_info: 'Cash is due before cook day — message us to arrange drop-off.',
  card_link: '', // Venmo / Square / card link
  cashapp_link: '', // second pay link (Cash App)
  pickup_address: '',
  pickup_window: 'Sunday afternoon',
  delivery_window: 'Monday morning',
  delivery_fee: 0,
  delivery_fee_note: '', // e.g. "Fee depends on Uber" when the fee isn't fixed
  delivery_zips: [],
  card_fee: 2, // $ added to the total when paying by card
  weekly_capacity: 40, // max different customers per cook week (0 = no limit)
  cutoff_day: 5, // Friday
  cutoff_hour: 20, // 8 PM
  business_phone: '',
  kitchen_address: '',
  popups: [], // promo/discount pop-up messages shown to customers (see lib/popups.js)
  last_report_week: '', // Monday (YYYY-MM-DD) of the last weekly sales report emailed, so it never sends twice
  push_subs: [], // admin devices subscribed to new-order push (see lib/push.js); never public
};

// Two ways to connect:
//  A) SUPABASE_SERVICE_ROLE_KEY (classic server key), or
//  B) SUPABASE_KEY (publishable key) + DINO_DB_SECRET — row-level security
//     only lets requests through that carry the secret header, which only
//     this server knows (see supabase-schema.sql).
const serverKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
// Demo mode only when Supabase isn't configured AND we're not in production
// (or DEMO_MODE=1 is set explicitly). A production deploy that loses its env
// vars fails with an error instead of silently serving demo data/password.
export const isDemo = () =>
  !(process.env.SUPABASE_URL && serverKey()) &&
  (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === '1');

let sb = null;
function supa() {
  if (!sb) {
    if (!(process.env.SUPABASE_URL && serverKey())) throw new Error('Missing SUPABASE_URL / SUPABASE_KEY environment variables.');
    const headers = process.env.DINO_DB_SECRET ? { 'x-dino-key': process.env.DINO_DB_SECRET } : {};
    sb = createClient(process.env.SUPABASE_URL, serverKey(), {
      auth: { persistSession: false },
      global: { headers },
    });
  }
  return sb;
}

// ---------------- demo store ----------------
function demo() {
  if (!globalThis.__dinoDemo) {
    const store = { seq: 1000, orders: [], settings: { ...DEFAULT_SETTINGS } };
    const week = cookDateFor();
    const mk = (o, daysAgo = 0) => {
      const priced = priceCart(o.cart);
      store.seq += 1;
      const fee = o.fulfillment === 'delivery' ? store.settings.delivery_fee : 0;
      store.orders.push({
        id: `demo-${store.seq}`,
        order_no: store.seq,
        created_at: new Date(Date.now() - daysAgo * 864e5).toISOString(),
        cook_date: o.cook_date || week,
        customer_name: o.name,
        phone: o.phone,
        phone_digits: o.phone.replace(/\D/g, ''),
        email: '',
        items: priced.lines,
        meal_count: priced.meals,
        lb_total: priced.lbs,
        subtotal: priced.subtotal,
        delivery_fee: fee,
        total: priced.subtotal + fee,
        fulfillment: o.fulfillment,
        address: o.address || '',
        zip: o.zip || '',
        delivery_notes: '',
        payment_method: o.pay,
        paid: !!o.paid,
        paid_at: o.paid ? new Date().toISOString() : null,
        status: o.status || 'new',
        diet: o.diet || [],
        allergy_notes: '',
        notes: '',
        custom_request: '',
        lang: 'en',
        source: o.source || 'web',
        route_pos: null,
        view_token: `demo${store.seq}`,
      });
    };
    const meal = (protein, carb, veg, sets, flavor) => ({ protein, flavor, carb, veg, sets });
    const prev = (() => {
      const [y, m, d] = week.split('-').map(Number);
      const x = new Date(y, m - 1, d - 7);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    })();
    // last week (regulars)
    mk({ name: 'Marcus Reyes', phone: '(909) 555-0142', fulfillment: 'pickup', pay: 'zelle', paid: true, status: 'done', cook_date: prev, cart: { meals: [meal('tritip', 'cilantrorice', 'broccoli', 1), meal('chicken', 'whiterice', 'asparagus', 1, 'teriyaki')] } }, 8);
    mk({ name: 'Alyssa Gomez', phone: '(909) 555-0188', fulfillment: 'delivery', address: '412 W Base Line Rd, Rialto, CA', zip: '92376', pay: 'card', paid: true, status: 'done', cook_date: prev, cart: { meals: [meal('turkey', 'brownrice', 'greenbeans', 2)] } }, 9);
    // this week
    mk({ name: 'Marcus Reyes', phone: '(909) 555-0142', fulfillment: 'pickup', pay: 'zelle', paid: true, cart: { meals: [meal('tritip', 'cilantrorice', 'broccoli', 1), meal('chicken', 'whiterice', 'asparagus', 1, 'teriyaki')] } }, 1);
    mk({ name: 'Alyssa Gomez', phone: '(909) 555-0188', fulfillment: 'delivery', address: '412 W Base Line Rd, Rialto, CA', zip: '92376', pay: 'card', paid: false, cart: { meals: [meal('turkey', 'brownrice', 'greenbeans', 2)] } }, 1);
    mk({ name: 'Danny Ortiz', phone: '(909) 555-0110', fulfillment: 'delivery', address: '1650 N Riverside Ave, Rialto, CA', zip: '92376', pay: 'cash', paid: false, source: 'dm', diet: ['nodairy'], cart: { meals: [meal('swchicken', 'sweetpotato', 'fajitas', 2), meal('groundbeef', 'whiterice', 'broccoli', 1, 'taco')] } }, 0);
    mk({ name: 'Bri Castillo', phone: '(909) 555-0177', fulfillment: 'pickup', pay: 'zelle', paid: true, cart: { lbs: [{ kind: 'protein', item: 'tritip', lbs: 2 }, { kind: 'carb', item: 'cilantrorice', lbs: 1 }, { kind: 'veg', item: 'asparagus', lbs: 1 }] } }, 0);
    mk({ name: 'Rob Delgado', phone: '(909) 555-0199', fulfillment: 'delivery', address: '250 W Foothill Blvd, Rialto, CA', zip: '92376', pay: 'zelle', paid: false, source: 'text', cart: { meals: [meal('shrimp', 'cilantrorice', 'asparagus', 1), meal('tilapia', 'brownrice', 'broccoli', 1)] } }, 0);
    globalThis.__dinoDemo = store;
  }
  return globalThis.__dinoDemo;
}

// ---------------- settings ----------------
// Settings are read on nearly every request, so cache them briefly per server
// instance. saveSettings clears the cache; order validation passes fresh:true.
const SETTINGS_TTL_MS = 15000;
export async function getSettings({ fresh = false } = {}) {
  if (isDemo()) return { ...DEFAULT_SETTINGS, ...demo().settings };
  const c = globalThis.__dinoSettings;
  if (!fresh && c && Date.now() - c.at < SETTINGS_TTL_MS) return { ...c.value };
  const { data, error } = await supa().from('shop_settings').select('data').eq('id', 1).maybeSingle();
  if (error) throw error;
  const value = { ...DEFAULT_SETTINGS, ...(data?.data || {}) };
  globalThis.__dinoSettings = { at: Date.now(), value };
  return { ...value };
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings({ fresh: true })), ...patch };
  if (isDemo()) {
    demo().settings = next;
    return next;
  }
  const { error } = await supa().from('shop_settings').upsert({ id: 1, data: next });
  if (error) throw error;
  globalThis.__dinoSettings = { at: Date.now(), value: next };
  return next;
}

// ---------------- orders ----------------
export async function insertOrder(row) {
  if (isDemo()) {
    const s = demo();
    s.seq += 1;
    const o = { id: `demo-${s.seq}`, order_no: s.seq, created_at: new Date().toISOString(), view_token: `demo${s.seq}`, ...row };
    s.orders.push(o);
    return o;
  }
  const { data, error } = await supa().from('orders').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function listOrders({ cookDate } = {}) {
  if (isDemo()) {
    return demo()
      .orders.filter((o) => !cookDate || o.cook_date === cookDate)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  let q = supa().from('orders').select('*').order('created_at', { ascending: false });
  if (cookDate) q = q.eq('cook_date', cookDate);
  const { data, error } = await q.limit(1000);
  if (error) throw error;
  return data || [];
}

// Distinct customers (by phone) with a live order in a cook week. Cancelled
// orders free their spot; a repeat customer only ever counts once.
export async function weekCustomers(cookDate) {
  if (isDemo()) {
    return new Set(demo().orders.filter((o) => o.cook_date === cookDate && o.status !== 'cancelled').map((o) => o.phone_digits));
  }
  const { data, error } = await supa()
    .from('orders')
    .select('phone_digits')
    .eq('cook_date', cookDate)
    .neq('status', 'cancelled')
    .limit(5000);
  if (error) throw error;
  return new Set((data || []).map((o) => o.phone_digits));
}

export async function getOrder(id) {
  if (isDemo()) return demo().orders.find((o) => o.id === id) || null;
  const { data, error } = await supa().from('orders').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateOrder(id, patch) {
  if (isDemo()) {
    const o = demo().orders.find((x) => x.id === id);
    if (!o) return null;
    Object.assign(o, patch);
    return o;
  }
  const { data, error } = await supa().from('orders').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteOrder(id) {
  if (isDemo()) {
    const s = demo();
    s.orders = s.orders.filter((o) => o.id !== id);
    return true;
  }
  const { error } = await supa().from('orders').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// The customer's private order page looks orders up by their view_token.
export async function getOrderByToken(token) {
  if (!/^[a-z0-9]{6,32}$/i.test(String(token || ''))) return null;
  if (isDemo()) return demo().orders.find((o) => o.view_token === token) || null;
  const { data, error } = await supa().from('orders').select('*').eq('view_token', token).maybeSingle();
  if (error) throw error;
  return data;
}

export async function ordersByTokens(tokens) {
  const list = (tokens || []).filter((t) => /^[a-z0-9]{6,32}$/i.test(String(t || ''))).slice(0, 10);
  if (!list.length) return [];
  if (isDemo()) return demo().orders.filter((o) => list.includes(o.view_token));
  const { data, error } = await supa().from('orders').select('*').in('view_token', list);
  if (error) throw error;
  return data || [];
}

// ---- Customer push subscribers (see /api/customer-push) ----
export async function addCustomerPush(sub, lang = 'en') {
  const row = { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, lang: lang === 'es' ? 'es' : 'en' };
  if (isDemo()) {
    const d = demo();
    d.customerPush = (d.customerPush || []).filter((x) => x.endpoint !== row.endpoint).concat(row);
    return true;
  }
  const { error } = await supa().from('customer_push').upsert(row, { onConflict: 'endpoint' });
  if (error) throw error;
  return true;
}

export async function removeCustomerPush(endpoints) {
  const list = (Array.isArray(endpoints) ? endpoints : [endpoints]).filter(Boolean);
  if (!list.length) return 0;
  if (isDemo()) {
    const d = demo();
    d.customerPush = (d.customerPush || []).filter((x) => !list.includes(x.endpoint));
    return list.length;
  }
  const { error } = await supa().from('customer_push').delete().in('endpoint', list);
  if (error) throw error;
  return list.length;
}

export async function listCustomerPush() {
  if (isDemo()) return demo().customerPush || [];
  const { data, error } = await supa().from('customer_push').select('endpoint,p256dh,auth,lang').limit(5000);
  if (error) throw error;
  return data || [];
}

export async function countCustomerPush() {
  if (isDemo()) return (demo().customerPush || []).length;
  const { count, error } = await supa().from('customer_push').select('endpoint', { count: 'exact', head: true });
  if (error) return 0;
  return count || 0;
}

export async function ordersByPhone(digits, limit = 10) {
  if (isDemo()) {
    return demo()
      .orders.filter((o) => o.phone_digits === digits)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const { data, error } = await supa()
    .from('orders')
    .select('*')
    .eq('phone_digits', digits)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function recentOrders(days = 120) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  if (isDemo()) return demo().orders.filter((o) => o.created_at >= since);
  const { data, error } = await supa()
    .from('orders')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data || [];
}

// ---------------- weekly cutoff-reminder texts ----------------
// One row per phone number that ticked "Text me a weekly reminder" at checkout.
const demoReminders = () => (globalThis.__dinoReminders = globalThis.__dinoReminders || new Map());

export async function upsertReminder({ digits, name = '', lang = 'en' }) {
  const row = { phone_digits: digits, name, lang: lang === 'es' ? 'es' : 'en', opted_in_at: new Date().toISOString(), opted_out_at: null };
  if (isDemo()) {
    demoReminders().set(digits, { ...(demoReminders().get(digits) || {}), ...row });
    return row;
  }
  const { error } = await supa().from('sms_reminders').upsert(row, { onConflict: 'phone_digits' });
  if (error) throw error;
  return row;
}

export async function reminderSubscribers() {
  if (isDemo()) return [...demoReminders().values()].filter((r) => !r.opted_out_at);
  const { data, error } = await supa().from('sms_reminders').select('*').is('opted_out_at', null).limit(5000);
  if (error) throw error;
  return data || [];
}

export async function updateReminder(digits, patch) {
  if (isDemo()) {
    const r = demoReminders().get(digits);
    if (r) Object.assign(r, patch);
    return r || null;
  }
  const { error } = await supa().from('sms_reminders').update(patch).eq('phone_digits', digits);
  if (error) throw error;
  return true;
}
