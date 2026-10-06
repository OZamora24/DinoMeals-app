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
  card_link: '',
  pickup_address: '',
  pickup_window: 'Sunday afternoon',
  delivery_window: 'Monday morning',
  delivery_fee: 0,
  delivery_zips: [],
  cutoff_day: 5, // Friday
  cutoff_hour: 20, // 8 PM
  business_phone: '',
  kitchen_address: '',
};

// Two ways to connect:
//  A) SUPABASE_SERVICE_ROLE_KEY (classic server key), or
//  B) SUPABASE_KEY (publishable key) + DINO_DB_SECRET — row-level security
//     only lets requests through that carry the secret header, which only
//     this server knows (see supabase-schema.sql).
const serverKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
export const isDemo = () => !(process.env.SUPABASE_URL && serverKey());

let sb = null;
function supa() {
  if (!sb) {
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
export async function getSettings() {
  if (isDemo()) return { ...DEFAULT_SETTINGS, ...demo().settings };
  const { data, error } = await supa().from('shop_settings').select('data').eq('id', 1).maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_SETTINGS, ...(data?.data || {}) };
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  if (isDemo()) {
    demo().settings = next;
    return next;
  }
  const { error } = await supa().from('shop_settings').upsert({ id: 1, data: next });
  if (error) throw error;
  return next;
}

// ---------------- orders ----------------
export async function insertOrder(row) {
  if (isDemo()) {
    const s = demo();
    s.seq += 1;
    const o = { id: `demo-${s.seq}`, order_no: s.seq, created_at: new Date().toISOString(), ...row };
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
