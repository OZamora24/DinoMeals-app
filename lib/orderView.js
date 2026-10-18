// What a customer may see about their own order (the private /o/<code> page, the
// "My orders" list and the confirmation receipt). Never the name, phone, address or notes.
import { dateKey, laNow } from './menu.js';

export const MY_ORDERS_KEY = 'dino_orders';
export const MY_ORDERS_MAX = 5;

export function publicOrder(o) {
  if (!o) return null;
  return {
    token: o.view_token,
    order_no: o.order_no,
    created_at: o.created_at,
    cook_date: o.cook_date,
    fulfillment: o.fulfillment,
    items: (o.items || []).map(({ type, protein, flavor, carb, veg, oz, count, kind, item, lbs, qty, unit, total }) => ({ type, protein, flavor, carb, veg, oz, count, kind, item, lbs, qty, unit, total })),
    meal_count: Number(o.meal_count) || 0,
    lb_total: Number(o.lb_total) || 0,
    subtotal: o.subtotal == null ? null : Number(o.subtotal),
    delivery_fee: Number(o.delivery_fee) || 0,
    total: o.total == null ? null : Number(o.total),
    custom_request: o.total == null ? String(o.custom_request || '').slice(0, 400) : '',
    payment_method: o.payment_method,
    paid: !!o.paid,
    status: o.status || 'new',
    lang: o.lang === 'es' ? 'es' : 'en',
  };
}

// Tracker: Received → Paid → Cooking → Ready. `done` = steps finished (0–4),
// `now` = the step in progress (-1 for none), `key` = status for chips/banners.
export function trackOf(o, today = dateKey(laNow())) {
  if (!o) return null;
  if (o.status === 'cancelled') return { key: 'cancelled', done: 0, now: -1 };
  if (o.status === 'done') return { key: o.fulfillment === 'delivery' ? 'delivered' : 'picked_up', done: 4, now: -1 };
  if (o.status === 'ready') return { key: 'ready', done: 4, now: -1 };
  if (o.total == null && !o.paid) return { key: 'quote', done: 1, now: 1 };
  if (!o.paid) return { key: 'unpaid', done: 1, now: 1 };
  const cooking = o.status === 'cooking' || (o.cook_date && today >= o.cook_date);
  if (cooking) return { key: 'cooking', done: 2, now: 2 };
  return { key: 'paid', done: 2, now: -1 };
}

export const VIEW_TXT = {
  en: {
    steps: ['Received', 'Paid', 'Cooking', 'Ready'],
    chip: { cancelled: 'Cancelled', delivered: 'Delivered', picked_up: 'Picked up', ready: 'Ready', quote: 'Price coming', unpaid: 'Waiting on payment', cooking: 'Cooking', paid: 'Paid' },
    banner: {
      cancelled: 'This order was cancelled. Questions? Text us.',
      delivered: 'Delivered. Enjoy your meals! 🦖',
      picked_up: 'Picked up. Enjoy your meals! 🦖',
      ready_pickup: 'Your order is ready for pickup! 📦',
      ready_delivery: 'Your order is ready and out for delivery! 🚗',
      quote: "We'll text you a price soon.",
      unpaid: 'Pay to lock in your spot, then we start cooking.',
      cooking: "We're cooking your order! 🔥",
      paid: "Payment received. Thank you! We'll cook on cook day.",
    },
    your_order: 'Your order',
    order: 'Order',
    pickup: 'Pickup',
    delivery: 'Delivery',
    cook_day: 'Cook day',
    subtotal: 'Subtotal',
    fee: 'Delivery fee',
    total: 'Total',
    extra: 'extra',
    custom: 'Your request',
    again: 'Order this again',
    save: 'Save receipt',
    share: 'Share order link',
    copied: 'Link copied!',
    my_orders: 'My orders',
    my_orders_empty: 'Orders you place on this phone show up here.',
    my_orders_hint: 'Saved on this phone · tap one to open it',
    not_found_t: "We couldn't find that order",
    not_found_s: 'The link may be cut off. Check the text we sent you, or text us.',
    close: 'Close',
    paid_badge: 'Paid ✓',
    unpaid_badge: 'Not paid yet',
    contact_t: 'Save us so the links in your texts work',
    contact_s: (n) => `Your order texts come from ${n}. iPhone only makes links tappable from numbers in your contacts.`,
    contact_btn: 'Add DinoMeals to contacts',
  },
  es: {
    steps: ['Recibida', 'Pagada', 'Cocinando', 'Lista'],
    chip: { cancelled: 'Cancelada', delivered: 'Entregada', picked_up: 'Recogida', ready: 'Lista', quote: 'Precio pendiente', unpaid: 'Falta el pago', cooking: 'Cocinando', paid: 'Pagada' },
    banner: {
      cancelled: 'Esta orden fue cancelada. ¿Preguntas? Mándanos un texto.',
      delivered: 'Entregada. ¡Buen provecho! 🦖',
      picked_up: 'Recogida. ¡Buen provecho! 🦖',
      ready_pickup: '¡Tu orden está lista para recoger! 📦',
      ready_delivery: '¡Tu orden está lista y va en camino! 🚗',
      quote: 'Te mandamos el precio por texto pronto.',
      unpaid: 'Paga para apartar tu lugar y empezamos a cocinar.',
      cooking: '¡Estamos cocinando tu orden! 🔥',
      paid: 'Pago recibido. ¡Gracias! Cocinamos el día de cocina.',
    },
    your_order: 'Tu orden',
    order: 'Orden',
    pickup: 'Recoger',
    delivery: 'Entrega',
    cook_day: 'Día de cocina',
    subtotal: 'Subtotal',
    fee: 'Cargo de entrega',
    total: 'Total',
    extra: 'extra',
    custom: 'Tu pedido',
    again: 'Ordenar esto otra vez',
    save: 'Guardar recibo',
    share: 'Compartir enlace',
    copied: '¡Enlace copiado!',
    my_orders: 'Mis órdenes',
    my_orders_empty: 'Las órdenes que hagas en este teléfono aparecen aquí.',
    my_orders_hint: 'Guardadas en este teléfono · toca una para abrirla',
    not_found_t: 'No encontramos esa orden',
    not_found_s: 'Puede que el enlace esté cortado. Revisa el texto que te mandamos o mándanos un texto.',
    close: 'Cerrar',
    paid_badge: 'Pagada ✓',
    unpaid_badge: 'Sin pagar',
    contact_t: 'Guárdanos para que los enlaces en tus textos funcionen',
    contact_s: (n) => `Tus textos de la orden vienen del ${n}. El iPhone solo deja tocar enlaces de números en tus contactos.`,
    contact_btn: 'Agregar DinoMeals a contactos',
  },
};

// ---- "My orders" saved on this phone (localStorage) ----
export function readMyOrders() {
  try {
    const v = JSON.parse(window.localStorage.getItem(MY_ORDERS_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => x && x.token) : [];
  } catch {
    return [];
  }
}

export function rememberOrder(o) {
  if (!o || !o.token) return;
  try {
    const entry = { token: o.token, order_no: o.order_no, cook_date: o.cook_date, total: o.total, meal_count: o.meal_count, lb_total: o.lb_total, at: o.created_at || new Date().toISOString() };
    const rest = readMyOrders().filter((x) => x.token !== o.token);
    const list = [entry, ...rest].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, MY_ORDERS_MAX);
    window.localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('dino-orders'));
  } catch {}
}

