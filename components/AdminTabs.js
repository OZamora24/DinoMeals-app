import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PROTEINS, CARBS, VEGGIES, ALLERGEN_LABELS, PORTIONS, DIET_FLAGS, mealOz,
  lineLabel, lineSummary, proteinLabel, nameOf, byId, prettyDate, money,
} from '../lib/menu';
import { Flame, Printer, Check, Repeat, Chat, Route } from './Icons';

const STATUS = ['new', 'quote', 'confirmed', 'cooking', 'ready', 'done', 'cancelled'];
export const SOURCE_LABEL = { web: 'Website', dm: 'IG DM', text: 'Text', call: 'Call', repeat: 'Repeat' };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const dietLabel = (id) => DIET_FLAGS.find((d) => d.id === id)?.en || id;
export const smsHref = (phone, body) => `sms:${String(phone).replace(/[^\d+]/g, '')}${/iPhone|iPad/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') ? '&' : '?'}body=${encodeURIComponent(body)}`;
export const lineText = (l) => lineSummary(l);

export async function api(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Request failed'), { status: r.status });
  return j;
}

export function Stat({ label, value, sub, hot }) {
  return (
    <div className={`stat ${hot ? 'hot' : ''}`}>
      <small>{label}</small>
      <b>{value}</b>
      {sub && <span>{sub}</span>}
    </div>
  );
}

/* =========================== COOK SHEET =========================== */
export function CookTab({ orders, week }) {
  const [paidOnly, setPaidOnly] = useState(false);
  const src = orders.filter((o) => !paidOnly || o.paid);
  const sheet = useMemo(() => {
    const groups = { protein: {}, carb: {}, veg: {} };
    const add = (g, key, label, meals, oz, bulkLb) => {
      const r = (groups[g][key] ||= { label, meals: 0, oz: 0, bulk: 0 });
      r.meals += meals;
      r.oz += oz;
      r.bulk += bulkLb;
    };
    let containers = 0;
    for (const o of src) {
      for (const l of o.items || []) {
        if (l.type === 'meal') {
          containers += l.count;
          const oz = mealOz(l); // customers can pick bigger portions
          add('protein', `${l.protein}:${l.flavor || ''}`, proteinLabel(l.protein, l.flavor), l.count, l.count * oz.protein, 0);
          if (byId(CARBS, l.carb)) add('carb', l.carb, nameOf(byId(CARBS, l.carb)), l.count, l.count * oz.carb, 0);
          if (byId(VEGGIES, l.veg)) add('veg', l.veg, nameOf(byId(VEGGIES, l.veg)), l.count, l.count * oz.veg, 0);
        } else if (l.type === 'extra') {
          const key = l.kind === 'protein' ? `${l.item}:` : l.item;
          add(l.kind, key, lineLabel(l), l.qty, l.qty * PORTIONS[l.kind], 0);
        } else if (l.type === 'lb') {
          const key = l.kind === 'protein' ? `${l.item}:${l.flavor || ''}` : l.item;
          add(l.kind, key, lineLabel(l), 0, l.lbs * 16, l.lbs);
        }
      }
    }
    const sort = (o) => Object.values(o).sort((a, b) => b.oz - a.oz);
    return { protein: sort(groups.protein), carb: sort(groups.carb), veg: sort(groups.veg), containers };
  }, [src]);
  const lb = (oz) => (oz / 16).toFixed(oz % 16 === 0 ? 0 : 1);
  const totalOz = (g) => g.reduce((a, r) => a + r.oz, 0);

  return (
    <div className="cook">
      <div className="cook-head">
        <div>
          <h2 className="display sm">Cook sheet · {prettyDate(week)}</h2>
          <p className="muted small">Cooked weight. Portions: protein {PORTIONS.protein}oz · carb {PORTIONS.carb}oz · veggie {PORTIONS.veg}oz.</p>
        </div>
        <div className="row">
          <label className="check"><input type="checkbox" checked={paidOnly} onChange={(e) => setPaidOnly(e.target.checked)} /> Paid orders only</label>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={16} /> Print</button>
        </div>
      </div>
      <div className="stat-row">
        <Stat label="Meal containers" value={sheet.containers} />
        <Stat label="Protein to cook" value={`${lb(totalOz(sheet.protein))} lb`} />
        <Stat label="Carbs" value={`${lb(totalOz(sheet.carb))} lb`} />
        <Stat label="Veggies" value={`${lb(totalOz(sheet.veg))} lb`} />
      </div>
      {[['protein', 'Proteins', Flame], ['carb', 'Carbs', null], ['veg', 'Veggies', null]].map(([k, title]) => (
        <section key={k} className="cook-group">
          <h3 className="menu-cat">{title}</h3>
          {sheet[k].length === 0 ? (
            <p className="muted small">Nothing yet.</p>
          ) : (
            <table className="cook-table">
              <thead><tr><th>Item</th><th>Meals</th><th>Bulk lb</th><th>Total to cook</th></tr></thead>
              <tbody>
                {sheet[k].map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{r.meals || '—'}</td>
                    <td>{r.bulk || '—'}</td>
                    <td><b>{lb(r.oz)} lb</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
      <section className="cook-group">
        <h3 className="menu-cat">Labels / packing list</h3>
        <ul className="pack-list">
          {src.map((o) => (
            <li key={o.id}>
              <b>#{o.order_no} {o.customer_name}</b> — {o.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}{o.paid ? '' : ' · UNPAID'}
              {(o.diet?.length || o.allergy_notes) ? <span className="flag"> ⚠ {[...(o.diet || []).map(dietLabel), o.allergy_notes].filter(Boolean).join(', ')}</span> : null}
              <div className="muted small">{(o.items || []).map(lineText).join(' · ')}{o.custom_request ? ` · ✎ ${o.custom_request}` : ''}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* =========================== PAYMENTS =========================== */
export function PayTab({ orders, patch, settings }) {
  const priced = orders.filter((o) => o.total != null);
  const paid = priced.filter((o) => o.paid);
  const unpaid = priced.filter((o) => !o.paid);
  const sum = (l) => l.reduce((a, o) => a + Number(o.total || 0), 0);
  const byMethod = ['zelle', 'cash', 'card'].map((m) => ({ m, paid: sum(paid.filter((o) => o.payment_method === m)), owed: sum(unpaid.filter((o) => o.payment_method === m)) }));
  const reminder = (o) =>
    `Hi ${o.customer_name.split(' ')[0]}! DinoMeals here 🦖 Your order #${o.order_no} (${money(o.total)}) is on the list for Sunday. Payment is due before we cook — ` +
    (o.payment_method === 'zelle' && settings.zelle_info ? `Zelle to ${settings.zelle_info} (memo #${o.order_no}).` : o.payment_method === 'card' && settings.card_link ? `pay here: ${settings.card_link}` : `let me know when it's sent.`) +
    ' Thank you!';
  return (
    <div>
      <div className="stat-row">
        <Stat label="Collected" value={money(sum(paid))} sub={`${paid.length} orders`} />
        <Stat label="Still owed" value={money(sum(unpaid))} sub={`${unpaid.length} orders`} hot={unpaid.length > 0} />
        {byMethod.map((x) => (
          <Stat key={x.m} label={x.m[0].toUpperCase() + x.m.slice(1)} value={money(x.paid)} sub={x.owed ? `${money(x.owed)} owed` : 'all in'} />
        ))}
      </div>
      <h3 className="menu-cat">Waiting on payment</h3>
      {unpaid.length === 0 && <p className="muted empty">Everyone’s paid. 🎉</p>}
      <div className="pay-list">
        {unpaid.map((o) => (
          <div className="pay-row" key={o.id}>
            <div>
              <b>#{o.order_no} {o.customer_name}</b>
              <div className="muted small">{o.payment_method} · {o.phone}</div>
            </div>
            <div className="pay-amt">{money(o.total)}</div>
            <div className="row">
              <a className="btn btn-ghost btn-sm" href={smsHref(o.phone, reminder(o))}><Chat size={14} /> Remind</a>
              <button className="btn btn-red btn-sm" onClick={() => patch(o.id, { paid: true })}><Check size={14} /> Mark paid</button>
            </div>
          </div>
        ))}
      </div>
      {paid.length > 0 && (
        <>
          <h3 className="menu-cat">Paid</h3>
          <div className="pay-list">
            {paid.map((o) => (
              <div className="pay-row paid" key={o.id}>
                <div><b>#{o.order_no} {o.customer_name}</b><div className="muted small">{o.payment_method}</div></div>
                <div className="pay-amt">{money(o.total)}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => patch(o.id, { paid: false })}>Undo</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================== DELIVERY ROUTE =========================== */
export function RouteTab({ orders, patch, settings }) {
  const stops = orders
    .filter((o) => o.fulfillment === 'delivery')
    .sort((a, b) => (a.route_pos ?? 999) - (b.route_pos ?? 999) || String(a.zip).localeCompare(String(b.zip)) || String(a.address).localeCompare(String(b.address)));

  function move(i, dir) {
    const next = stops.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((o, k) => o.route_pos !== k && patch(o.id, { route_pos: k }));
  }

  const origin = settings.kitchen_address || settings.pickup_address || '';
  // Google Maps allows ~9 stops per link; split long routes into legs.
  const legs = [];
  for (let i = 0; i < stops.length; i += 9) legs.push(stops.slice(i, i + 9));
  const mapsUrl = (leg, legIdx) => {
    const start = legIdx === 0 ? origin : `${legs[legIdx - 1].at(-1).address} ${legs[legIdx - 1].at(-1).zip}`;
    const pts = leg.map((o) => `${o.address} ${o.zip}`);
    const dest = pts.at(-1);
    const way = pts.slice(0, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1${start ? `&origin=${encodeURIComponent(start)}` : ''}&destination=${encodeURIComponent(dest)}${way ? `&waypoints=${encodeURIComponent(way)}` : ''}&travelmode=driving`;
  };

  return (
    <div>
      <div className="route-head">
        <div>
          <h2 className="display sm">Monday route · {stops.length} stop{stops.length === 1 ? '' : 's'}</h2>
          <p className="muted small">Starts at: {origin || <i>add your kitchen address in Menu & settings</i>}. Sorted by ZIP — use ▲▼ to fine-tune, then open in Google Maps.</p>
        </div>
        <div className="row wrap">
          {legs.map((leg, i) => (
            <a key={i} className="btn btn-red btn-sm" href={mapsUrl(leg, i)} target="_blank" rel="noreferrer">
              <Route size={16} /> Open route{legs.length > 1 ? ` ${i + 1}/${legs.length}` : ''}
            </a>
          ))}
        </div>
      </div>
      {stops.length === 0 && <p className="muted empty">No deliveries this week.</p>}
      <ol className="stops">
        {stops.map((o, i) => (
          <li key={o.id} className={o.paid ? '' : 'unpaid'}>
            <span className="stop-n">{i + 1}</span>
            <div className="stop-main">
              <b>{o.customer_name}</b> <span className="muted small">#{o.order_no} · {o.meal_count ? `${o.meal_count} meals` : ''}{o.lb_total ? ` ${o.lb_total} lb` : ''}{o.paid ? '' : ' · UNPAID'}</span>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(`${o.address} ${o.zip}`)}`} target="_blank" rel="noreferrer">{o.address} {o.zip}</a>
              {o.delivery_notes && <div className="muted small">{o.delivery_notes}</div>}
            </div>
            <div className="stop-act">
              <a className="btn btn-ghost btn-sm" href={smsHref(o.phone, `DinoMeals 🦖 On the way with your meals! ETA ~15 min.`)}><Chat size={14} /></a>
              <button className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
              <button className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === stops.length - 1}>▼</button>
              <button className={`btn btn-sm ${o.status === 'done' ? 'btn-red' : 'btn-ghost'}`} onClick={() => patch(o.id, { status: o.status === 'done' ? 'ready' : 'done' })}>
                <Check size={14} /> {o.status === 'done' ? 'Dropped' : 'Drop'}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* =========================== REGULARS =========================== */
export function RegularsTab({ week, weekOrders, repeat }) {
  const [all, setAll] = useState(null);
  useEffect(() => {
    api('/api/orders').then((j) => setAll(j.orders)).catch(() => setAll([]));
  }, []);
  const people = useMemo(() => {
    if (!all) return [];
    const m = {};
    for (const o of all) {
      if (o.status === 'cancelled') continue;
      const p = (m[o.phone_digits] ||= { name: o.customer_name, phone: o.phone, weeks: new Set(), orders: [], spent: 0 });
      p.weeks.add(o.cook_date);
      p.orders.push(o);
      p.spent += Number(o.total || 0);
    }
    return Object.entries(m)
      .map(([digits, p]) => {
        p.orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { digits, ...p, count: p.weeks.size, last: p.orders.find((o) => (o.items || []).length) || p.orders[0] };
      })
      .sort((a, b) => b.count - a.count || b.spent - a.spent);
  }, [all]);
  const inWeek = new Set(weekOrders.filter((o) => o.status !== 'cancelled').map((o) => o.phone_digits));
  const regulars = people.filter((p) => p.count >= 2);
  const missing = regulars.filter((p) => !inWeek.has(p.digits));

  if (!all) return <p className="muted">Loading…</p>;
  return (
    <div>
      <div className="route-head">
        <div>
          <h2 className="display sm">Regulars</h2>
          <p className="muted small">Anyone who’s ordered 2+ weeks. One tap copies their last order into {prettyDate(week)} (unpaid, current prices).</p>
        </div>
        {missing.length > 0 && (
          <button className="btn btn-red btn-sm" onClick={() => repeat(missing.map((p) => p.last.id), week)}>
            <Repeat size={16} /> Add all {missing.length} missing regulars
          </button>
        )}
      </div>
      {regulars.length === 0 && <p className="muted empty">No repeat customers yet — they’ll show up here after their second week.</p>}
      <div className="reg-list">
        {regulars.map((p) => (
          <div className="reg" key={p.digits}>
            <div className="reg-main">
              <b>{p.name}</b> <span className="muted small">{p.phone}</span>
              <div className="reg-meta"><span className="pill">{p.count} weeks</span> <span className="muted small">{money(p.spent)} lifetime</span></div>
              <div className="muted small">Usual: {(p.last.items || []).map(lineText).join(' · ') || p.last.custom_request}</div>
            </div>
            {inWeek.has(p.digits) ? (
              <span className="pill ok"><Check size={14} /> On this week</span>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => repeat([p.last.id], week).then(() => setAll([...all]))}><Repeat size={14} /> Add to this week</button>
            )}
          </div>
        ))}
      </div>
      {people.length > regulars.length && (
        <p className="muted small">{people.length - regulars.length} one-time customers not shown.</p>
      )}
    </div>
  );
}

/* =========================== SETTINGS =========================== */
export function SettingsTab({ settings, save, week }) {
  const [s, setS] = useState(settings);
  const [copied, setCopied] = useState(false);
  useEffect(() => setS(settings), [settings]);
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const soldOut = new Set(s.sold_out || []);
  const toggleOut = (id) => save({ sold_out: soldOut.has(id) ? s.sold_out.filter((x) => x !== id) : [...(s.sold_out || []), id] });
  const items = [
    ...PROTEINS.map((p) => ({ id: p.id, name: p.name, group: 'Proteins' })),
    ...PROTEINS.flatMap((p) => (p.flavors || []).filter((f) => f.id !== 'plain').map((f) => ({ id: `${p.id}:${f.id}`, name: `${p.name} · ${f.name}`, group: 'Flavors', flavor: true }))),
    ...CARBS.map((c) => ({ id: c.id, name: c.name, group: 'Carbs' })),
    ...VEGGIES.map((v) => ({ id: v.id, name: v.name, group: 'Veggies' })),
  ];
  const orderLink = typeof window !== 'undefined' ? `${window.location.origin}/order` : '/order';

  return (
    <div className="settings">
      <section className="set-card wide">
        <h3>Customer texts</h3>
        <p className="small">
          {s._sms?.live ? (
            <><b className="ok-text">ON</b> — customers who tick the first box at checkout get 3 texts: order received, payment received (when you mark Paid) and ready (when you mark Ready). Customers who tick the second box get a reminder every Thursday at 4 PM while ordering is open.</>
          ) : (
            <><b className="warn-text">OFF</b> — waiting on carrier approval (Twilio A2P 10DLC). The opt-in box is already on the checkout so the carriers can review it; nothing is texted until Orlando switches texts on.{s._sms && !s._sms.configured ? ' Twilio keys not added yet.' : ''}</>
          )}
        </p>
        <p className="muted small">Opted-in orders show a <b>Texts ✓</b> tag. Pages: <a href="/privacy" target="_blank" rel="noreferrer">Privacy</a> · <a href="/terms" target="_blank" rel="noreferrer">Terms</a> · <a href="/sms" target="_blank" rel="noreferrer">SMS opt-in</a></p>
      </section>

      <ReportCard settings={settings} />

      <section className="set-card">
        <h3>Ordering</h3>
        <label className="switch-row">
          <span><b>Taking orders</b><br /><small className="muted">Turn off to pause the order page.</small></span>
          <button className={`switch ${s.ordering_open ? 'on' : ''}`} onClick={() => save({ ordering_open: !s.ordering_open })}><span /></button>
        </label>
        <div className="grid2">
          <label>Weekly cutoff day
            <select className="input" value={s.cutoff_day} onChange={(e) => set('cutoff_day', +e.target.value)}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label>Cutoff time
            <select className="input" value={s.cutoff_hour} onChange={(e) => set('cutoff_hour', +e.target.value)}>
              {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{((h + 11) % 12) + 1}:00 {h < 12 ? 'AM' : 'PM'}</option>)}
            </select>
          </label>
        </div>
        <p className="muted small">Orders after the cutoff go to the following Sunday. Current cook day: <b>{prettyDate(settings.cook_date)}</b></p>
        <label>Max customers per week (0 = no limit)
          <input className="input" inputMode="numeric" value={s.weekly_capacity} onChange={(e) => set('weekly_capacity', e.target.value.replace(/\D/g, ''))} />
        </label>
        <p className="muted small">Once this many different customers have ordered for the week, the site shows "This week is full". Someone who already ordered can still add to their order; you can always enter orders yourself.</p>
        <label>Banner message (shows on the site)
          <input className="input" value={s.announcement} placeholder="e.g. No cook Nov 30 — happy Thanksgiving!" onChange={(e) => set('announcement', e.target.value)} />
        </label>
        <button className="btn btn-red btn-sm" onClick={() => save({ cutoff_day: s.cutoff_day, cutoff_hour: s.cutoff_hour, announcement: s.announcement, weekly_capacity: s.weekly_capacity })}>Save</button>
      </section>

      <section className="set-card">
        <h3>Share the order link</h3>
        <p className="muted small">Put this in your IG bio and send it when people DM or text — every order lands here instead of in your messages.</p>
        <div className="row">
          <input className="input" readOnly value={orderLink} />
          <button className="btn btn-red btn-sm" onClick={() => { navigator.clipboard?.writeText(orderLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
        <p className="muted small">Someone ordering by DM anyway? Tap <Link href="/order?admin=1">+ DM order</Link> and enter it for them.</p>
      </section>

      <section className="set-card">
        <h3>Payment info (shown after checkout)</h3>
        <label>Zelle (name / phone / email)<input className="input" value={s.zelle_info} onChange={(e) => set('zelle_info', e.target.value)} placeholder="Juan Carlos · (909) 555-0000" /></label>
        <label>Card / Venmo payment link (optional)<input className="input" value={s.card_link} onChange={(e) => set('card_link', e.target.value)} placeholder="https://venmo.com/… or https://square.link/…" /></label>
        <label>Cash App link (optional)<input className="input" value={s.cashapp_link || ''} onChange={(e) => set('cashapp_link', e.target.value)} placeholder="https://cash.app/$yourtag" /></label>
        <label>Cash instructions<input className="input" value={s.cash_info} onChange={(e) => set('cash_info', e.target.value)} /></label>
        <label>Card fee ($ added to the total when a customer pays by card)<input className="input" inputMode="decimal" value={s.card_fee} onChange={(e) => set('card_fee', e.target.value)} /></label>
        <button className="btn btn-red btn-sm" onClick={() => save({ zelle_info: s.zelle_info, card_link: s.card_link, cashapp_link: s.cashapp_link, cash_info: s.cash_info, card_fee: s.card_fee })}>Save</button>
      </section>

      <section className="set-card">
        <h3>Pickup & delivery</h3>
        <div className="grid2">
          <label>Pickup window<input className="input" value={s.pickup_window} onChange={(e) => set('pickup_window', e.target.value)} placeholder="Sunday 3–6 PM" /></label>
          <label>Delivery window<input className="input" value={s.delivery_window} onChange={(e) => set('delivery_window', e.target.value)} placeholder="Monday 6–10 AM" /></label>
        </div>
        <label>Pickup address (shown to customers who pick up)<input className="input" value={s.pickup_address} onChange={(e) => set('pickup_address', e.target.value)} /></label>
        <label>Kitchen address (route start — private)<input className="input" value={s.kitchen_address} onChange={(e) => set('kitchen_address', e.target.value)} /></label>
        <div className="grid2">
          <label>Delivery fee ($)<input className="input" inputMode="decimal" value={s.delivery_fee} onChange={(e) => set('delivery_fee', e.target.value)} /></label>
          <label>Delivery fee note (when it varies)<input className="input" value={s.delivery_fee_note || ''} onChange={(e) => set('delivery_fee_note', e.target.value)} placeholder="Fee depends on Uber" /></label>
          <label>Delivery ZIPs (12-mile area, comma separated — blank = any)
            <input className="input" value={(s.delivery_zips || []).join(', ')} onChange={(e) => set('delivery_zips', e.target.value.split(/[ ,]+/).filter(Boolean))} placeholder="92376, 92377, 92335…" />
          </label>
        </div>
        <button className="btn btn-red btn-sm" onClick={() => save({ pickup_window: s.pickup_window, delivery_window: s.delivery_window, pickup_address: s.pickup_address, kitchen_address: s.kitchen_address, delivery_fee: s.delivery_fee, delivery_fee_note: s.delivery_fee_note, delivery_zips: s.delivery_zips })}>Save</button>
      </section>

      <section className="set-card wide">
        <h3>Menu: sold out · macros · allergens</h3>
        <p className="muted small">Macros are per portion (protein {PORTIONS.protein}oz, carb {PORTIONS.carb}oz, veggie {PORTIONS.veg}oz). Flavor rows can have their own numbers; leave them blank to use the base protein's. The order page adds them up per meal once every part has numbers. Allergen labels: double-check these — customers see them.</p>
        <div className="menu-table">
          <div className="mt-head"><span>Item</span><span>Sold out</span><span>Cal</span><span>P</span><span>C</span><span>F</span><span>Allergens</span></div>
          {items.map((it) => {
            const m = (s.macros || {})[it.id] || {};
            const al = (s.allergens || {})[it.id] || [];
            const setM = (k, v) => set('macros', { ...(s.macros || {}), [it.id]: { ...m, [k]: v } });
            const toggleA = (a) => set('allergens', { ...(s.allergens || {}), [it.id]: al.includes(a) ? al.filter((x) => x !== a) : [...al, a] });
            return (
              <div className={`mt-row ${it.flavor ? 'flavor' : ''}`} key={it.id}>
                <span className="mt-name">{it.name}</span>
                <span>{!it.flavor && <button className={`switch sm ${soldOut.has(it.id) ? 'on' : ''}`} onClick={() => toggleOut(it.id)}><span /></button>}</span>
                {['cal', 'p', 'c', 'f'].map((k) => (
                  <input key={k} className="input xs" inputMode="numeric" placeholder={it.flavor ? 'base' : { cal: 'Cal', p: 'P', c: 'C', f: 'F' }[k]} value={m[k] ?? ''} onChange={(e) => setM(k, e.target.value.replace(/[^\d.]/g, ''))} />
                ))}
                <span className="al-chips">
                  {Object.keys(ALLERGEN_LABELS).map((a) => (
                    <button key={a} className={`chip xs ${al.includes(a) ? 'on' : ''}`} onClick={() => toggleA(a)}>{ALLERGEN_LABELS[a].en}</button>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
        <button className="btn btn-red" onClick={() => save({ macros: s.macros, allergens: s.allergens })}>Save macros & allergens</button>
      </section>
    </div>
  );
}

// ---------- Messages: notifications sent to customers' phones ----------
const blankPopup = () => ({
  id: `m${Date.now().toString(36)}`, title: '', body: '', title_es: '', body_es: '',
  cta_label: '', cta_label_es: '', cta_url: '', active: false, notify: true, notified_at: 0, start: '', end: '', updated: Date.now(),
});
const POPUP_TEXT_KEYS = ['title', 'body', 'title_es', 'body_es'];
const sentLabel = (p) => (p.notified_at ? `Sent ${new Date(p.notified_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} to ${p.notified_count || 0} phone${p.notified_count === 1 ? '' : 's'}` : '');

// How the notification will look on a phone's lock screen.
function PushPreview({ popup, onClose }) {
  const [es, setEs] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const title = (es && popup.title_es) || popup.title || 'DinoMeals';
  const body = (es && popup.body_es) || popup.body || '';
  return (
    <div className="pv-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pv-card" role="dialog" aria-modal="true" aria-label="Notification preview">
        <p className="small muted">This is how it looks on a phone ({es ? 'Spanish' : 'English'}).</p>
        <div className="pv-notif">
          <span className="pv-icon"><img src="/icon-192.png" alt="" /></span>
          <div className="pv-text">
            <div className="pv-app">DINOMEALS · now</div>
            <b>{title.length > 60 ? `${title.slice(0, 59)}…` : title}</b>
            <div>{body.length > 180 ? `${body.slice(0, 179)}…` : body}</div>
          </div>
        </div>
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setEs((v) => !v)}>{es ? 'Show English' : 'Show Spanish'}</button>
          <button className="btn btn-red btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function MessagesTab({ settings, save, reload }) {
  const saved = settings.popups || [];
  const phones = settings._push_customers || 0; // customers who turned on notifications
  const [note, setNote] = useState('');
  const [list, setList] = useState(saved);
  const [open, setOpen] = useState(() => new Set()); // which message drop-downs are open
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setList(settings.popups || []), [settings.popups]);
  const upd = (id, patch) => setList((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const toggleOpen = (id) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const dirty = JSON.stringify(list) !== JSON.stringify(saved);
  function addNew() {
    const p = blankPopup();
    setList((l) => [p, ...l]);
    setOpen((o) => new Set(o).add(p.id)); // a new message starts open so you can type
  }
  async function commit() {
    setBusy(true);
    const before = new Map(saved.map((p) => [p.id, p]));
    const stamped = list.map((p) => {
      const old = before.get(p.id);
      const changed = !old || POPUP_TEXT_KEYS.some((k) => (old[k] || '') !== (p[k] || ''));
      return changed ? { ...p, updated: Date.now() } : p;
    });
    try {
      await save({ popups: stamped });
      setOpen(new Set()); // saved: every message folds back into its drop-down
      setNote('Saved. Turn a message ON to send it to customers.');
    } finally { setBusy(false); }
  }
  // ON sends the saved message to customers' phones right away; OFF just turns it off. Save changes is
  // only for typing or editing a message, so a message must be saved (and have no unsaved edits) first.
  async function toggleActive(p) {
    if (busy) return;
    if (dirty) { setNote('Press Save changes first, then turn the message ON or OFF.'); return; }
    if (!saved.some((x) => x.id === p.id)) { setNote('Save the message first (Save changes), then turn it ON to send it.'); return; }
    setBusy(true);
    try {
      if (p.active) {
        await save({ popups: saved.map((x) => (x.id === p.id ? { ...x, active: false } : x)) });
        setNote('Turned OFF. Nothing was sent.');
      } else {
        await sendNow(p, true);
      }
    } finally { setBusy(false); }
  }
  async function sendNow(p, activate) {
    try {
      const j = await api('/api/popup-notify', { method: 'POST', body: { id: p.id, activate: !!activate } });
      if (j.ok) setNote(phones ? `ON: sent to ${j.sent} phone${j.sent === 1 ? '' : 's'}.` : 'ON. Nobody has turned on notifications yet, so nothing was sent. Customers turn them on with the 🔔 in the app.');
      else setNote(j.error === 'push_not_configured' ? 'Notifications are not set up on the server yet.' : `Could not send: ${j.error || 'unknown error'}`);
    } catch (e) {
      setNote(`Could not send: ${e.message}`);
    }
    if (reload) await reload();
  }
  const remove = (id) => { if (window.confirm('Delete this message for good?')) setList((l) => l.filter((p) => p.id !== id)); };
  return (
    <div className="settings">
      <section className="set-card wide">
        <h3>Customer notifications</h3>
        <p className="small">Write the message customers get as a notification on their phone (the DinoMeals app on their Home Screen, or Chrome on Android). Use <b>Save changes</b> only when you type or edit a message. Turning a message <b>ON</b> sends it to customers right away. Tapping the notification opens the app with the dino transition and shows the message.</p>
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" disabled={list.length >= 12} onClick={addNew}>+ New message</button>
          <button className="btn btn-red btn-sm" disabled={!dirty || busy} onClick={commit}>{busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
        </div>
        <p className="small muted">{phones} customer phone{phones === 1 ? ' has' : 's have'} notifications on. Customers turn them on with the 🔔 in the app.</p>
        {note && <p className="small" role="status">{note}</p>}
      </section>
      {list.length === 0 && <section className="set-card wide"><p className="muted">No messages yet. Tap "+ New message".</p></section>}
      {list.map((p) => {
        const isOpen = open.has(p.id);
        return (
          <section className={`set-card wide msg-card ${isOpen ? 'is-open' : ''}`} key={p.id}>
            <div className="msg-head">
              <button className="msg-toggle" onClick={() => toggleOpen(p.id)} aria-expanded={isOpen}>
                <span className="msg-chev" aria-hidden="true">▸</span>
                <span className="msg-title"><b>{p.title || 'New message'}</b>{p.notified_at > 0 && <small className="muted"> · sent</small>}</span>
              </button>
              <button className={`onoff ${p.active ? 'on' : ''}`} onClick={() => toggleActive(p)} disabled={busy} aria-pressed={p.active} title={p.active ? 'ON: customers were sent this. Tap to turn OFF.' : 'OFF: tap to turn ON and send it to customers now.'}>{p.active ? 'ON' : 'OFF'}</button>
            </div>
            <div className={`msg-acc ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
              <div className="msg-acc-in">
                <label>Title<input className="input" maxLength={60} value={p.title} onChange={(e) => upd(p.id, { title: e.target.value })} placeholder="Pick up reminder" /></label>
                <label>Message<textarea className="input" rows={3} maxLength={180} value={p.body} onChange={(e) => upd(p.id, { body: e.target.value })} placeholder="Pickup is Sunday 3–8 PM. See you then! 🦖" /></label>
                <p className="small muted">{(p.body || '').length}/180 characters (phones cut longer messages off).</p>
                {p.notified_at > 0 && <p className="small muted">{sentLabel(p)}</p>}
                <details>
                  <summary className="small">Spanish version (optional — sent to customers using ES)</summary>
                  <label>Título<input className="input" maxLength={60} value={p.title_es} onChange={(e) => upd(p.id, { title_es: e.target.value })} /></label>
                  <label>Mensaje<textarea className="input" rows={3} maxLength={180} value={p.body_es} onChange={(e) => upd(p.id, { body_es: e.target.value })} /></label>
                </details>
                <div className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setPreview(p)}>Preview</button>
                  {saved.some((x) => x.id === p.id) && p.active && !dirty && (
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { await sendNow(p, false); } finally { setBusy(false); } }}>{p.notified_at ? 'Send again' : 'Send now'}</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(p.id)}>Delete</button>
                </div>
              </div>
            </div>
          </section>
        );
      })}
      {preview && <PushPreview popup={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

// ---------- Weekly sales report card (Menu & settings) ----------
function ReportCard({ settings }) {
  const mail = settings._mail || {};
  const [state, setState] = useState({ busy: false, msg: '' });
  async function sendNow() {
    setState({ busy: true, msg: '' });
    try {
      const j = await api('/api/report', { method: 'POST', body: {} });
      setState({ busy: false, msg: j.ok ? `Sent to ${j.to}: ${j.week} (${j.orders} orders, ${j.weeks} weekly tab${j.weeks === 1 ? '' : 's'}).` : j.error === 'email_not_configured' ? 'Email is not set up yet (RESEND_API_KEY is missing in Vercel).' : `Could not send: ${j.error || 'unknown error'}` });
    } catch (e) {
      setState({ busy: false, msg: `Could not send: ${e.message}` });
    }
  }
  return (
    <section className="set-card wide">
      <h3>Weekly sales report</h3>
      <p className="small">
        {mail.configured
          ? <><b className="ok-text">ON</b> — every Monday at 8 PM Pacific, last week's sales (Monday to Sunday) are emailed to <b>{mail.to}</b> as an Excel file: that week's Orders + Summary, plus one tab per week so far.</>
          : <><b className="warn-text">OFF</b> — the email service is not connected yet. Once the key is added in Vercel, a report goes to <b>{mail.to || 'dinomealsllc@gmail.com'}</b> every Monday at 8 PM Pacific.</>}
      </p>
      <div className="row-actions">
        <button className="btn btn-ghost btn-sm" disabled={state.busy} onClick={sendNow}>{state.busy ? 'Sending…' : "Email last week's report now"}</button>
      </div>
      {state.msg && <p className="small">{state.msg}</p>}
    </section>
  );
}
