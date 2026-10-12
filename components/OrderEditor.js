import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PROTEINS, CARBS, VEGGIES, NONE, DIET_FLAGS, byId, flavorOf, lineLabel, mealLineCount, mealUnitPrice, priceCart, money,
} from '../lib/menu';
import { linesToCart, cartKey } from '../lib/cart';
import { formatPhone } from '../lib/orderForm';
import { Stepper } from './order/Controls';
import { Plus, X } from './Icons';

// Admin: edit everything on a placed order. Only the fields you actually
// changed are sent, so opening this and saving never re-prices an old order.
// Items are re-priced from today's menu only when you change them.
export default function OrderEditor({ order, onSave, onClose }) {
  const start = useMemo(() => linesToCart(order.items), [order]);
  const [f, setF] = useState({
    customer_name: order.customer_name || '',
    phone: order.phone || '',
    email: order.email || '',
    fulfillment: order.fulfillment || 'pickup',
    address: order.address || '',
    zip: order.zip || '',
    delivery_notes: order.delivery_notes || '',
    payment_method: order.payment_method || 'zelle',
    cook_date: order.cook_date || '',
    allergy_notes: order.allergy_notes || '',
    notes: order.notes || '',
    custom_request: order.custom_request || '',
  });
  const [meals, setMeals] = useState(start.meals.map((m) => ({ ...m, count: mealLineCount(m) })));
  const [lbs, setLbs] = useState(start.lbs);
  const [extras, setExtras] = useState(start.extras || []);
  const [total, setTotal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const cart = { meals, lbs, extras };
  const itemsChanged = cartKey(cart) !== cartKey(start);
  const preview = priceCart(cart, [], { skipMin: true });
  const subtotal = preview.ok ? preview.subtotal : null;

  const setMeal = (i, patch) => setMeals((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const pickProtein = (i, id) => {
    const p = byId(PROTEINS, id);
    setMeal(i, { protein: id, flavor: p.flavors ? p.flavors[0].id : undefined });
  };
  const addMeal = () => setMeals((ms) => [...ms, { protein: PROTEINS[0].id, flavor: undefined, carb: CARBS[0].id, veg: VEGGIES[0].id, count: 1 }]);

  async function save() {
    setErr('');
    const body = {};
    for (const k of Object.keys(f)) {
      if (String(f[k] ?? '') !== String(order[k] ?? '')) body[k] = f[k];
    }
    if (itemsChanged) body.cart = { meals: meals.filter((m) => m.count > 0), lbs: lbs.filter((l) => Number(l.lbs) > 0), extras: extras.filter((x) => Number(x.qty) > 0) };
    if (total !== '') body.total = total;
    if (Object.keys(body).length === 0) return onClose();
    setBusy(true);
    try {
      await onSave(body);
      onClose();
    } catch (e) {
      setErr(e.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-head">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>← Back</button>
          <h2>Edit order #{order.order_no}</h2>
          <span />
        </div>
        <div className="sheet-body">
          <fieldset className="fs">
            <legend>Customer</legend>
            <label>Name<input className="input" value={f.customer_name} onChange={(e) => set('customer_name', e.target.value)} /></label>
            <div className="grid2">
              <label>Phone<input className="input" inputMode="tel" value={f.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} /></label>
              <label>Email<input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
            </div>
          </fieldset>

          <fieldset className="fs">
            <legend>Items</legend>
            {meals.map((m, i) => {
              const p = byId(PROTEINS, m.protein);
              const unit = mealUnitPrice(m);
              return (
                <div className="edit-line" key={`m${i}`}>
                  <div className="grid2">
                    <select className="input" value={m.protein} onChange={(e) => pickProtein(i, e.target.value)}>
                      {PROTEINS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    {p?.flavors ? (
                      <select className="input" value={flavorOf(p, m.flavor)?.id} onChange={(e) => setMeal(i, { flavor: e.target.value })}>
                        {p.flavors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    ) : <span />}
                    <select className="input" value={m.carb} onChange={(e) => setMeal(i, { carb: e.target.value })}>
                      {CARBS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      <option value={NONE}>No carb</option>
                    </select>
                    <select className="input" value={m.veg} onChange={(e) => setMeal(i, { veg: e.target.value })}>
                      {VEGGIES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      <option value={NONE}>No veggie</option>
                    </select>
                  </div>
                  <div className="edit-line-foot">
                    <Stepper value={m.count} onDec={() => setMeal(i, { count: Math.max(0, m.count - 1) })} onInc={() => setMeal(i, { count: m.count + 1 })} unit="meals" />
                    <b>{unit == null ? '—' : money(unit * m.count)}</b>
                    <button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => setMeals((ms) => ms.filter((_, j) => j !== i))}><X size={14} /></button>
                  </div>
                </div>
              );
            })}
            {lbs.map((l, i) => (
              <div className="edit-line" key={`l${i}`}>
                <div>{lineLabel({ type: 'lb', ...l })}</div>
                <div className="edit-line-foot">
                  <Stepper value={Number(l.lbs) || 0} onDec={() => setLbs((ls) => ls.map((x, j) => (j === i ? { ...x, lbs: Math.max(0, (Number(x.lbs) || 0) - 1) } : x)))} onInc={() => setLbs((ls) => ls.map((x, j) => (j === i ? { ...x, lbs: (Number(x.lbs) || 0) + 1 } : x)))} unit="lb" />
                  <span />
                  <button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => setLbs((ls) => ls.filter((_, j) => j !== i))}><X size={14} /></button>
                </div>
              </div>
            ))}
            {extras.map((x, i) => (
              <div className="edit-line" key={`x${i}`}>
                <div>Extra {lineLabel({ type: 'extra', ...x })}</div>
                <div className="edit-line-foot">
                  <Stepper value={Number(x.qty) || 0} onDec={() => setExtras((xs) => xs.map((y, j) => (j === i ? { ...y, qty: Math.max(0, (Number(y.qty) || 0) - 1) } : y)))} onInc={() => setExtras((xs) => xs.map((y, j) => (j === i ? { ...y, qty: (Number(y.qty) || 0) + 1 } : y)))} unit="x" />
                  <span />
                  <button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => setExtras((xs) => xs.filter((_, j) => j !== i))}><X size={14} /></button>
                </div>
              </div>
            ))}
            {meals.length === 0 && lbs.length === 0 && extras.length === 0 && <p className="muted small">No priced items on this order.</p>}
            <button className="btn btn-ghost btn-sm" onClick={addMeal}><Plus size={14} /> Add a meal</button>
            {itemsChanged && (
              <p className="muted small">
                {subtotal == null ? 'Check the items — something is not valid.' : `Food subtotal ${money(subtotal)} · delivery / card fees are re-applied when you save.`}
              </p>
            )}
            <label>Custom request<textarea className="input" rows={2} value={f.custom_request} onChange={(e) => set('custom_request', e.target.value)} /></label>
          </fieldset>

          <fieldset className="fs">
            <legend>Pickup / delivery</legend>
            <div className="chips">
              {['pickup', 'delivery'].map((k) => (
                <button key={k} className={`chip sm ${f.fulfillment === k ? 'on' : ''}`} onClick={() => set('fulfillment', k)}>{k === 'pickup' ? 'Pickup' : 'Delivery'}</button>
              ))}
            </div>
            {f.fulfillment === 'delivery' && (
              <>
                <div className="grid-addr">
                  <label>Address<input className="input" value={f.address} onChange={(e) => set('address', e.target.value)} /></label>
                  <label>ZIP<input className="input" inputMode="numeric" maxLength={5} value={f.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, ''))} /></label>
                </div>
                <label>Drop-off notes<input className="input" value={f.delivery_notes} onChange={(e) => set('delivery_notes', e.target.value)} /></label>
              </>
            )}
            <label>Cook day<input className="input" type="date" value={f.cook_date} onChange={(e) => set('cook_date', e.target.value)} /></label>
          </fieldset>

          <fieldset className="fs">
            <legend>Payment</legend>
            <div className="chips">
              {['zelle', 'cash', 'card'].map((k) => (
                <button key={k} className={`chip sm ${f.payment_method === k ? 'on' : ''}`} onClick={() => set('payment_method', k)}>{k[0].toUpperCase() + k.slice(1)}</button>
              ))}
            </div>
            <label>Set the total by hand (optional — leave blank to auto-calculate{order.total != null ? `, now ${money(order.total)}` : ''})
              <input className="input" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))} placeholder="$" />
            </label>
          </fieldset>

          <fieldset className="fs">
            <legend>Notes</legend>
            <label>Allergies / diet notes<input className="input" value={f.allergy_notes} onChange={(e) => set('allergy_notes', e.target.value)} /></label>
            {(order.diet || []).length > 0 && <p className="muted small">Diet flags: {(order.diet || []).map((d) => (DIET_FLAGS.find((x) => x.id === d) || {}).en || d).join(', ')}</p>}
            <label>Kitchen notes<textarea className="input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
          </fieldset>
          {err && <div className="error">{err}</div>}
        </div>
        <div className="sheet-foot">
          <button className="btn btn-red btn-lg btn-block" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
