import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PROTEINS, CARBS, VEGGIES, ALLERGEN_LABELS, PORTIONS, DIET_FLAGS, mealOz,
  lineLabel, lineSummary, proteinLabel, nameOf, byId, prettyDate, money,
} from '../lib/menu';
import { customCookParts, labelCount } from '../lib/labelSpots';
import { loyaltyState, rewardLabel, ordinal, EVERY } from '../lib/loyalty';
import { referralCredits, referralConfig, referralsThisMonth } from '../lib/referral';
import { trainerConfig, cleanTrainerList, trainerCredits, clientsThisMonth } from '../lib/trainer';
import { monthlyConfig, activeMonthly } from '../lib/monthly';
import { keyLabel, MIN_MEAL_RATINGS } from '../lib/reviews';
import { HOME_COUNT, captionFromFileName } from '../lib/photos';
import { venmoLink, cardLinks } from '../lib/payLinks';
import { Flame, Printer, Check, Repeat, Chat, Route, Camera } from './Icons';

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
// By-the-lb burgers pick a style as a flavor; on the cook sheet they join the matching meal burger.
const cookProtein = (item, flavor = '') => {
  if (item === 'burgers' && flavor === 'smashed') return ['smashburgers', ''];
  if (item === 'burgers' && flavor === 'smoked') return ['burgers', ''];
  return [item, flavor || ''];
};
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
          if (l.kind === 'protein') {
            // Same food, one row: lb "Burgers · Smashed" = "Smashed Burgers", lb "Burgers · Smoked" = "Smoked Burgers".
            const [id, fl] = cookProtein(l.item, l.flavor);
            const key = `${id}:${fl}`;
            add('protein', key, id === l.item && fl === (l.flavor || '') ? lineLabel(l) : proteinLabel(id, fl || undefined), 0, l.lbs * 16, l.lbs);
          } else add(l.kind, l.item, lineLabel(l), 0, l.lbs * 16, l.lbs);
        }
      }
      // Custom-quote orders: the meals entered in the label editor (oz / gram amounts).
      for (const l of o.label_lines || []) {
        for (const p of customCookParts(l)) {
          if (p.kind === 'protein') containers += p.meals;
          const [pid, pfl] = p.kind === 'protein' ? cookProtein(p.id, p.flavor) : [p.id, ''];
          const label = p.kind === 'protein' ? proteinLabel(pid, pfl || undefined) : nameOf(byId(p.kind === 'carb' ? CARBS : VEGGIES, p.id));
          add(p.kind, p.kind === 'protein' ? `${pid}:${pfl}` : p.id, label, p.meals, p.oz, p.lbs || 0);
        }
      }
    }
    const sort = (o) => Object.values(o).sort((a, b) => b.oz - a.oz);
    // Everything that gets packed and labeled: meals + bulk (1 per lb, a ½ lb gets its own) + extras.
    const total = src.reduce((n, o) => n + labelCount(o), 0);
    return { protein: sort(groups.protein), carb: sort(groups.carb), veg: sort(groups.veg), containers, total, other: total - containers };
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
        <Stat label="Total containers" value={sheet.total} sub={sheet.other ? `meals + ${sheet.other} bulk / extras` : null} />
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
  const byMethod = ['zelle', 'venmo', 'cash', 'card'].map((m) => ({ m, paid: sum(paid.filter((o) => o.payment_method === m)), owed: sum(unpaid.filter((o) => o.payment_method === m)) }));
  const reminder = (o) =>
    `Hi ${o.customer_name.split(' ')[0]}! DinoMeals here 🦖 Your order #${o.order_no} (${money(o.total)}) is on the list for Sunday. Payment is due before we cook — ` +
    (o.payment_method === 'zelle' && settings.zelle_info ? `Zelle to ${settings.zelle_info} (memo #${o.order_no}).` : o.payment_method === 'venmo' && venmoLink(settings) ? `Venmo: ${venmoLink(settings)}` : o.payment_method === 'card' && cardLinks(settings)[0] ? `pay here: ${cardLinks(settings)[0].href}` : `let me know when it's sent.`) +
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
// 🎁 Rewards tab: every customer program in one place (loyalty, referrals, trainers, monthly plans).
export function RewardsTab() {
  const [all, setAll] = useState(null);
  useEffect(() => {
    api('/api/orders').then((j) => setAll(j.orders)).catch(() => setAll([]));
  }, []);
  if (!all) return <p className="muted">Loading…</p>;
  return (
    <div>
      <LoyaltyPanel all={all} />
      <ReferralPanel all={all} />
      <TrainerPanel all={all} />
      <MonthlyPanel all={all} />
    </div>
  );
}

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
        <label>Venmo payment link (optional)<input className="input" value={s.venmo_link || ''} onChange={(e) => set('venmo_link', e.target.value)} placeholder="https://venmo.com/u/yourname" /></label>
        <label>Card payment link (optional)<input className="input" value={s.card_link} onChange={(e) => set('card_link', e.target.value)} placeholder="https://square.link/…" /></label>
        <label>Cash App link (optional)<input className="input" value={s.cashapp_link || ''} onChange={(e) => set('cashapp_link', e.target.value)} placeholder="https://cash.app/$yourtag" /></label>
        <label>Cash instructions<input className="input" value={s.cash_info} onChange={(e) => set('cash_info', e.target.value)} /></label>
        <label>Card fee ($ added to the total when a customer pays by card)<input className="input" inputMode="decimal" value={s.card_fee} onChange={(e) => set('card_fee', e.target.value)} /></label>
        <button className="btn btn-red btn-sm" onClick={() => save({ zelle_info: s.zelle_info, venmo_link: s.venmo_link, card_link: s.card_link, cashapp_link: s.cashapp_link, cash_info: s.cash_info, card_fee: s.card_fee })}>Save</button>
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

      <PromoCard settings={settings} save={save} />

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
                <div className="site-pop">
                  <label className="check-row"><input type="checkbox" checked={!!p.site} onChange={(e) => upd(p.id, { site: e.target.checked })} /> <span><b>Also pop up on the website</b><br /><small className="muted">While it's ON, everyone who opens the home or order page sees it once (on each phone/computer).</small></span></label>
                  {p.site && (
                    <div className="site-pop-fields">
                      <label>Show from (optional)<input className="input" type="date" value={p.start || ''} onChange={(e) => upd(p.id, { start: e.target.value })} /></label>
                      <label>Until (optional)<input className="input" type="date" value={p.end || ''} onChange={(e) => upd(p.id, { end: e.target.value })} /></label>
                      <label>Button text (optional)<input className="input" maxLength={30} value={p.cta_label || ''} onChange={(e) => upd(p.id, { cta_label: e.target.value })} placeholder="Order now" /></label>
                      <label>Button text (Spanish)<input className="input" maxLength={30} value={p.cta_label_es || ''} onChange={(e) => upd(p.id, { cta_label_es: e.target.value })} placeholder="Ordenar" /></label>
                      <label className="full">Button goes to (optional)<input className="input" value={p.cta_url || ''} onChange={(e) => upd(p.id, { cta_url: e.target.value.trim() })} placeholder="/order?code=LAUNCH10" /></label>
                    </div>
                  )}
                </div>
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

/* Promo codes customers type at checkout (or get from a ?code= link). */
function PromoCard({ settings, save }) {
  const [list, setList] = useState(settings.promo_codes || []);
  const [copied, setCopied] = useState('');
  useEffect(() => setList(settings.promo_codes || []), [settings.promo_codes]);
  const upd = (i, p) => setList((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const copy = async (code) => {
    try { await navigator.clipboard.writeText(`${origin}/order?code=${code}`); setCopied(code); setTimeout(() => setCopied(''), 1500); } catch {}
  };
  const dirty = JSON.stringify(list) !== JSON.stringify(settings.promo_codes || []);
  return (
    <section className="set-card wide">
      <h3>Promo codes</h3>
      <p className="muted small">Customers type the code at checkout, or open your link with the code already applied. The discount comes off the food (not delivery or card fees). Codes are checked again when the order is placed, so a code you switch off stops working right away. The order, receipt and Excel show the code and the $ off. Start/end dates are Pacific days (both included).</p>
      {list.length === 0 && <p className="small">No codes yet.</p>}
      <div className="promo-list">
        {list.map((p, i) => (
          <div className={`promo-row ${p.active === false ? 'off' : ''}`} key={i}>
            <input className="input" value={p.code} placeholder="LAUNCH10" maxLength={20} onChange={(e) => upd(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} aria-label="Code" />
            <span className="promo-val">
              <input className="input xs" inputMode="decimal" value={p.value ?? ''} onChange={(e) => upd(i, { value: e.target.value.replace(/[^\d.]/g, '') })} aria-label="Amount" />
              <select className="input xs" value={p.type || 'percent'} onChange={(e) => upd(i, { type: e.target.value })} aria-label="Type">
                <option value="percent">% off</option>
                <option value="amount">$ off</option>
              </select>
            </span>
            <span className="promo-dates">
              <label className="promo-end"><small>Starts (optional)</small><input className="input xs" type="date" value={p.starts || ''} onChange={(e) => upd(i, { starts: e.target.value })} /></label>
              <label className="promo-end"><small>Ends (optional)</small><input className="input xs" type="date" value={p.ends || ''} onChange={(e) => upd(i, { ends: e.target.value })} /></label>
            </span>
            <span className="promo-ctl">
              <button className={`switch sm ${p.active !== false ? 'on' : ''}`} onClick={() => upd(i, { active: p.active === false })} aria-label={p.active !== false ? 'On' : 'Off'} title={p.active !== false ? 'On' : 'Off'}><span /></button>
              <PromoStatus p={p} />
              <span className="promo-acts">
                {p.code && <button className="link small" onClick={() => copy(p.code)}>{copied === p.code ? 'Copied!' : 'Copy link'}</button>}
                <button className="link small danger" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>Remove</button>
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="promo-btns">
        <button className="btn btn-ghost btn-sm" onClick={() => setList((l) => [...l, { code: '', type: 'percent', value: 10, active: true, starts: '', ends: '' }])}>+ Add code</button>
        <button className="btn btn-red btn-sm" disabled={!dirty} onClick={() => save({ promo_codes: list })}>{dirty ? 'Save codes' : 'Saved'}</button>
      </div>
      {dirty && <p className="small warn-text">You have changes that aren't saved yet. Tap <b>Save codes</b>.</p>}
    </section>
  );
}

// "Live now" / "Starts Nov 1" / "Ended" / "Off" for one promo code (Pacific day).
function PromoStatus({ p }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const nice = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  let cls = 'on', txt = 'Live now';
  if (p.active === false) { cls = 'off'; txt = 'Off'; }
  else if (!(Number(p.value) > 0)) { cls = 'off'; txt = 'Needs an amount'; }
  else if (p.ends && today > p.ends) { cls = 'off'; txt = 'Ended'; }
  else if (p.starts && today < p.starts) { cls = 'soon'; txt = `Starts ${nice(p.starts)}`; }
  return <span className={`promo-st ${cls}`}>{txt}</span>;
}

// Customer Loyalty Rewards (lib/loyalty.js): who's close to a reward, unlocked / used / expired
// rewards, and a Renew button for expired ones. The on/off switch pauses new rewards.
function LoyaltyPanel({ all }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => { api('/api/settings').then((j) => setSettings(j.settings)).catch(() => setSettings({})); }, []);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const rows = useMemo(() => {
    if (!settings) return [];
    const by = {};
    for (const o of all) (by[o.phone_digits] ||= []).push(o);
    return Object.entries(by)
      .map(([digits, orders]) => ({ digits, name: orders[0].customer_name, phone: orders[0].phone, st: loyaltyState(orders, today, settings, digits) }))
      .filter((r) => r.st.count > 0)
      .sort((a, b) => b.st.count - a.st.count);
  }, [all, settings, today]);
  if (!settings) return null;
  const on = settings.loyalty?.on !== false;
  const toggle = async () => {
    setBusy('toggle');
    try { const j = await api('/api/settings', { method: 'POST', body: { loyalty: { ...(settings.loyalty || {}), on: !on } } }); setSettings(j.settings); } finally { setBusy(''); }
  };
  const renew = async (digits, milestone) => {
    setBusy(`${digits}:${milestone}`);
    try { await api('/api/rewards', { method: 'POST', body: { phone: digits, milestone } }); const j = await api('/api/settings'); setSettings(j.settings); } finally { setBusy(''); }
  };
  const ready = rows.filter((r) => r.st.available).length;
  const shown = open ? rows : rows.slice(0, 6);
  return (
    <section className="loy-panel">
      <div className="route-head">
        <div>
          <h2 className="display sm">⭐ Loyalty Rewards</h2>
          <p className="muted small">Paid orders of 8+ meals / 4+ lb (or quotes $80+), once per week, since {settings.loyalty?.start || '2026-11-08'}. Every 5th week unlocks a reward for their next order: 5% · 10% · $20 free meal · 20% · then 5–10% (you pick). Rewards last 30 days; promo + reward max 20%.</p>
        </div>
        <label className="switch-row">
          <span>{on ? 'On' : 'Paused'}</span>
          <button className={`switch ${on ? 'on' : ''}`} disabled={busy === 'toggle'} onClick={toggle} aria-label="Loyalty rewards on or off"><span /></button>
        </label>
      </div>
      {rows.length === 0 && <p className="muted empty">No counted orders yet. Customers show up here after their first paid order.</p>}
      {ready > 0 && <p className="loy-ready">🎁 {ready} customer{ready === 1 ? '' : 's'} with a reward ready to use.</p>}
      <div className="reg-list">
        {shown.map((r) => (
          <div className="reg loy-row" key={r.digits}>
            <div className="reg-main">
              <b>{r.name}</b> <span className="muted small">{r.phone}</span>
              <div className="loy-pips sm" aria-label={`${r.st.progress} of ${EVERY}`}>{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < r.st.progress ? 'on' : ''} />)}</div>
              <div className="muted small">{r.st.count} counted week{r.st.count === 1 ? '' : 's'} · {r.st.next.left} more to {rewardLabel(r.st.next.reward)} ({ordinal(r.st.next.at)})</div>
              {r.st.earned.length > 0 && (
                <div className="loy-chips">
                  {r.st.earned.map((e) => (
                    <span key={e.milestone} className={`loy-chip ${e.status}`}>
                      {ordinal(e.milestone)}: {rewardLabel(e)} ·{' '}
                      {e.status === 'used' ? `used on #${e.used_order}` : e.status === 'expired' ? `expired ${e.expires}` : `ready until ${e.expires}${e.renewed ? ' (renewed)' : ''}`}
                      {e.status === 'expired' && (
                        <button className="link" disabled={busy === `${r.digits}:${e.milestone}`} onClick={() => renew(r.digits, e.milestone)}>Renew 30 days</button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {rows.length > 6 && <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)}>{open ? 'Show less' : `Show all ${rows.length}`}</button>}
    </section>
  );
}

// Referral program (lib/referral.js): who brought whom, credits earned/used, on/off and amounts.
function ReferralPanel({ all }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  useEffect(() => { api('/api/settings').then((j) => setSettings(j.settings)).catch(() => setSettings({})); }, []);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const cfg = referralConfig(settings || {});
  const rows = useMemo(() => {
    if (!settings) return [];
    const byRef = {};
    const own = {};
    for (const o of all) {
      (own[o.phone_digits] ||= []).push(o);
      if (o.referral && o.referral.by) (byRef[o.referral.by] ||= []).push(o);
    }
    return Object.entries(byRef)
      .map(([digits, friends]) => {
        const mine = own[digits] || [];
        return { digits, name: mine[0]?.customer_name || friends[0].referral.by_name || 'Customer', phone: mine[0]?.phone || '', month: referralsThisMonth(friends), rc: referralCredits(friends, mine, today, settings) };
      })
      .sort((a, b) => b.rc.credits.length - a.rc.credits.length);
  }, [all, settings, today]);
  if (!settings) return null;
  const save = async (patch) => {
    setBusy(true);
    try { const j = await api('/api/settings', { method: 'POST', body: { referral: { ...cfg, ...patch } } }); setSettings(j.settings); setEdit(null); } finally { setBusy(false); }
  };
  const field = (k, label, suffix) => (
    <label className="ref-field">{label}
      <span><input className="input" inputMode="numeric" value={edit ? edit[k] : cfg[k]} onChange={(e) => setEdit({ ...(edit || cfg), [k]: e.target.value })} />{suffix}</span>
    </label>
  );
  return (
    <section className="loy-panel">
      <div className="route-head">
        <div>
          <h2 className="display sm">🤝 Referrals</h2>
          <p className="muted small">Every customer has a share link on their receipt. A new customer using it gets {cfg.new_pct}% off their first order. When that order is paid (8+ meals / 4+ lb), the person who shared it earns a {cfg.credit_pct}% credit for their next order (up to {cfg.max_stack} credits used at once, {cfg.expire_days} days to use). Max {cfg.monthly_cap} referrals per person per month. Separate from the 20% promo + loyalty max.</p>
        </div>
        <label className="switch-row">
          <span>{cfg.on ? 'On' : 'Paused'}</span>
          <button className={`switch ${cfg.on ? 'on' : ''}`} disabled={busy} onClick={() => save({ on: !cfg.on })} aria-label="Referrals on or off"><span /></button>
        </label>
      </div>
      <div className="ref-settings">
        {field('new_pct', 'New customer', '%')}
        {field('credit_pct', 'Credit per friend', '%')}
        {field('max_stack', 'Credits per order', '')}
        {field('monthly_cap', 'Max / month', '')}
        {field('expire_days', 'Credits last', 'days')}
        {edit && <button className="btn btn-red btn-sm" disabled={busy} onClick={() => save(edit)}>Save</button>}
      </div>
      {rows.length === 0 && <p className="muted empty">No referrals yet. They show up here when a new customer orders with someone's link.</p>}
      <div className="reg-list">
        {rows.map((r) => (
          <div className="reg loy-row" key={r.digits}>
            <div className="reg-main">
              <b>{r.name}</b> <span className="muted small">{r.phone}</span>
              <div className="muted small">{r.rc.credits.length} friend{r.rc.credits.length === 1 ? '' : 's'} referred · {r.month}/{cfg.monthly_cap} this month · {r.rc.available} credit{r.rc.available === 1 ? '' : 's'} ready</div>
              <div className="loy-chips">
                {r.rc.credits.map((c) => (
                  <span key={c.id} className={`loy-chip ${c.status}`}>
                    {c.friend} #{c.order_no} · {c.status === 'pending' ? 'waiting for payment' : c.status === 'used' ? `credit used on #${c.used_on}` : c.status === 'expired' ? `credit expired ${c.expires}` : `credit ready until ${c.expires}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Trainer Partner program (lib/trainer.js): Juan's trainers, their codes, clients and $ meal credits.
function TrainerPanel({ all }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  const [add, setAdd] = useState(null); // { name, phone, code }
  const [msg, setMsg] = useState('');
  useEffect(() => { api('/api/settings').then((j) => setSettings(j.settings)).catch(() => setSettings({})); }, []);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const cfg = trainerConfig(settings || {});
  const list = cleanTrainerList((settings && settings.trainers) || []);
  const rows = useMemo(() => {
    if (!settings) return [];
    return list.map((t) => {
      const clients = all.filter((o) => o.trainer && o.trainer.by === t.phone);
      const mine = all.filter((o) => o.phone_digits === t.phone);
      return { t, clients, month: clientsThisMonth(clients), tc: trainerCredits(clients, mine, today, settings) };
    });
  }, [all, settings, today]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!settings) return null;
  const saveCfg = async (patch) => {
    setBusy(true);
    try { const j = await api('/api/settings', { method: 'POST', body: { trainer: { ...cfg, ...patch } } }); setSettings(j.settings); setEdit(null); } finally { setBusy(false); }
  };
  const saveList = async (next) => {
    setBusy(true); setMsg('');
    try { const j = await api('/api/settings', { method: 'POST', body: { trainers: next } }); setSettings(j.settings); return true; } catch { setMsg('Could not save. Try again.'); return false; } finally { setBusy(false); }
  };
  const addTrainer = async () => {
    const code = String(add.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const phone = String(add.phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (!add.name.trim() || phone.length !== 10 || !code) { setMsg('Name, 10-digit phone and a code are all needed.'); return; }
    if (list.some((t) => t.code === code)) { setMsg('That code is already used.'); return; }
    if (await saveList([...list, { name: add.name, phone, code, active: true, added: today }])) setAdd(null);
  };
  const field = (k, label, suffix) => (
    <label className="ref-field">{label}
      <span><input className="input" inputMode="numeric" value={edit ? edit[k] : cfg[k]} onChange={(e) => setEdit({ ...(edit || cfg), [k]: e.target.value })} />{suffix}</span>
    </label>
  );
  return (
    <section className="loy-panel">
      <div className="route-head">
        <div>
          <h2 className="display sm">💪 Trainer Partners</h2>
          <p className="muted small">Each trainer has their own code. Their clients type it in the promo code box: {cfg.first_pct}% off their first DinoMeals order, then {cfg.pct}% off every order after. It takes the promo-code spot, so it shares the 20% max with loyalty rewards. The trainer earns a ${cfg.credit} meal credit every time a client's order is paid. Credits pile up, come off the trainer's own order automatically (one or all of them) and last {cfg.expire_days} days.</p>
        </div>
        <label className="switch-row">
          <span>{cfg.on ? 'On' : 'Paused'}</span>
          <button className={`switch ${cfg.on ? 'on' : ''}`} disabled={busy} onClick={() => saveCfg({ on: !cfg.on })} aria-label="Trainer program on or off"><span /></button>
        </label>
      </div>
      <div className="ref-settings">
        {field('first_pct', 'Client 1st order', '%')}
        {field('pct', 'Client after', '%')}
        {field('credit', 'Trainer credit', '$')}
        {field('expire_days', 'Credits last', 'days')}
        {edit && <button className="btn btn-red btn-sm" disabled={busy} onClick={() => saveCfg(edit)}>Save</button>}
      </div>
      {add ? (
        <div className="ref-settings">
          <label className="ref-field">Name<span><input className="input" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></span></label>
          <label className="ref-field">Phone<span><input className="input" inputMode="tel" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} /></span></label>
          <label className="ref-field">Code<span><input className="input" value={add.code} placeholder="COACHNAME" onChange={(e) => setAdd({ ...add, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) })} /></span></label>
          <button className="btn btn-red btn-sm" disabled={busy} onClick={addTrainer}>Add trainer</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAdd(null); setMsg(''); }}>Cancel</button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setAdd({ name: '', phone: '', code: '' })}>+ Add trainer</button>
      )}
      {msg && <p className="err small">{msg}</p>}
      {rows.length === 0 && <p className="muted empty">No trainers yet.</p>}
      <div className="reg-list">
        {rows.map((r) => (
          <div className="reg loy-row" key={r.t.code}>
            <div className="reg-main">
              <b>{r.t.name}</b> <span className="muted small">{r.t.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}</span> <span className="loy-chip available">{r.t.code}</span>{!r.t.active && <span className="loy-chip expired">paused</span>}
              <div className="muted small">{new Set(r.clients.filter((o) => o.status !== 'cancelled').map((o) => o.phone_digits)).size} client{r.clients.length === 1 ? '' : 's'} · {r.month} this month · {r.tc.available} credit{r.tc.available === 1 ? '' : 's'} ready = <b>{money(r.tc.amount)}</b> toward meals</div>
              <div className="loy-chips">
                {r.tc.credits.map((c) => (
                  <span key={c.id} className={`loy-chip ${c.status}`}>
                    {c.client} #{c.order_no} · {c.status === 'pending' ? 'waiting for payment' : c.status === 'used' ? `$${c.value} used on #${c.used_on}` : c.status === 'expired' ? `expired ${c.expires}` : `$${c.value} ready until ${c.expires}`}
                  </span>
                ))}
              </div>
            </div>
            <div className="reg-actions">
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => saveList(list.map((t) => (t.code === r.t.code ? { ...t, active: !t.active } : t)))}>{r.t.active ? 'Pause' : 'Turn on'}</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => window.confirm(`Remove ${r.t.name}? Their code stops working. Past orders keep their discount.`) && saveList(list.filter((t) => t.code !== r.t.code))}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Monthly Plan (lib/monthly.js): running plans, who's paid, and the % / max plans.
function MonthlyPanel({ all }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  useEffect(() => { api('/api/settings').then((j) => setSettings(j.settings)).catch(() => setSettings({})); }, []);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const cfg = monthlyConfig(settings || {});
  const plans = useMemo(() => {
    const by = {};
    for (const o of all) if (o.monthly && o.monthly.id) (by[o.monthly.id] ||= []).push(o);
    const running = activeMonthly(all, today);
    return Object.entries(by)
      .map(([id, os]) => ({ id, os: os.sort((a, b) => a.cook_date.localeCompare(b.cook_date)), running: running.has(id) }))
      .sort((a, b) => (a.running === b.running ? b.os[0].cook_date.localeCompare(a.os[0].cook_date) : a.running ? -1 : 1));
  }, [all, today]);
  if (!settings) return null;
  const nRunning = plans.filter((p) => p.running).length;
  const save = async (patch) => {
    setBusy(true);
    try { const j = await api('/api/settings', { method: 'POST', body: { monthly: { ...cfg, ...patch } } }); setSettings(j.settings); setEdit(null); } finally { setBusy(false); }
  };
  const field = (k, label, suffix) => (
    <label className="ref-field">{label}
      <span><input className="input" inputMode="numeric" value={edit ? edit[k] : cfg[k]} onChange={(e) => setEdit({ ...(edit || cfg), [k]: e.target.value })} />{suffix}</span>
    </label>
  );
  return (
    <section className="loy-panel">
      <div className="route-head">
        <div>
          <h2 className="display sm">📅 Monthly Plans · {nRunning} of {cfg.max}</h2>
          <p className="muted small">Customers pick meals for the next {cfg.weeks} weekends (8, 10 or 12 meals a week, or by the lb) and pay for all of it up front: {cfg.pct}% off, no promo codes or other discounts. Month to month, no automatic charge. Each weekend shows up as its own order in the week's list. Marking one week Paid marks the whole plan paid. A plan counts as one order for loyalty rewards. When {cfg.max} plans are running, the option is hidden until one ends.</p>
        </div>
        <label className="switch-row">
          <span>{cfg.on ? 'On' : 'Paused'}</span>
          <button className={`switch ${cfg.on ? 'on' : ''}`} disabled={busy} onClick={() => save({ on: !cfg.on })} aria-label="Monthly plans on or off"><span /></button>
        </label>
      </div>
      <div className="ref-settings">
        {field('pct', 'Plan discount', '%')}
        {field('max', 'Max plans', '')}
        {edit && <button className="btn btn-red btn-sm" disabled={busy} onClick={() => save(edit)}>Save</button>}
      </div>
      {plans.length === 0 && <p className="muted empty">No monthly plans yet.</p>}
      <div className="reg-list">
        {plans.map((p) => {
          const o = p.os[0];
          const paid = p.os.every((x) => x.paid);
          return (
            <div className="reg loy-row" key={p.id}>
              <div className="reg-main">
                <b>{o.customer_name}</b> <span className="muted small">{o.phone}</span>{' '}
                <span className={`loy-chip ${paid ? 'used' : 'pending'}`}>{paid ? 'paid' : 'not paid yet'}</span>{!p.running && <span className="loy-chip expired">ended</span>}
                <div className="muted small">Whole plan {money(Number(o.monthly.plan_total) || 0)} · {o.payment_method}</div>
                <div className="loy-chips">
                  {p.os.map((x) => (
                    <span key={x.id} className={`loy-chip ${x.status === 'cancelled' ? 'expired' : x.cook_date < today ? 'used' : 'available'}`}>
                      #{x.order_no} · {prettyDate(x.cook_date)} · {x.meal_count ? `${x.meal_count} meals` : ''}{x.meal_count && x.lb_total ? ' + ' : ''}{x.lb_total ? `${x.lb_total} lb` : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ⭐ Reviews tab (lib/reviews.js): overall score, meal scoreboard, every review with reply / hide.
export function ReviewsTab() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState('');
  const load = () => api('/api/reviews?all=1').then(setData).catch(() => setData({ reviews: [], board: [], summary: { count: 0, avg: 0 } }));
  useEffect(() => { load(); }, []);
  if (!data) return <p className="muted">Loading…</p>;
  const save = async (id, patch) => {
    setBusy(id);
    try {
      const j = await api('/api/reviews', { method: 'PATCH', body: { id, ...patch } });
      setData((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === id ? { ...r, ...j.review } : r)) }));
      if ('reply' in patch) setDraft((x) => ({ ...x, [id]: undefined }));
    } finally { setBusy(''); }
  };
  const S = ({ n }) => <span className="rv-show-stars">{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>;
  return (
    <div>
      <div className="route-head">
        <div>
          <h2 className="display sm">⭐ Reviews</h2>
          <p className="muted small">From real customers only (one per order, on their private order page, from the Tuesday after pickup). Shown as first name + last initial. Reply publicly, or hide spam / rude ones. Please don't hide a review just because it's low: an honest low review with a kind reply builds trust. Everyone who reviews is offered the Google link (dinomeals.app/review).</p>
        </div>
      </div>
      <div className="stat-row">
        <Stat label="Score" value={data.summary.count ? `⭐ ${data.summary.avg.toFixed(1)}` : '—'} sub={data.summary.count < 3 ? 'shows on the site at 3 reviews' : null} />
        <Stat label="Reviews" value={data.summary.count} />
      </div>
      <section className="loy-panel">
        <h3 className="display sm">Meal scoreboard</h3>
        <p className="muted small">Each meal's score shows on the order page once it has {MIN_MEAL_RATINGS}+ ratings. Below 4.0 is marked red.</p>
        {data.board.length === 0 && <p className="muted empty">No meal ratings yet.</p>}
        <div className="rv-board">
          {data.board.map((r, i) => (
            <div key={r.key} className={`rv-brow ${r.count >= MIN_MEAL_RATINGS && r.avg < 4 ? 'low' : ''}`}>
              <span className="n">{i + 1}</span>
              <span className="l">{r.label}<small className="c">{r.count} rating{r.count === 1 ? '' : 's'}{r.count < MIN_MEAL_RATINGS ? ' · not shown yet' : ''}</small></span>
              <span className="s">⭐ {r.avg.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </section>
      {data.reviews.length === 0 && <p className="muted empty">No reviews yet. They start coming in the Tuesday after a pickup.</p>}
      <div className="reg-list">
        {data.reviews.map((r) => (
          <div className={`reg rv-admin ${r.status === 'hidden' ? 'is-hidden' : ''}`} key={r.id}>
            <div className="reg-main">
              <div className="rv-card-h"><b>{r.name} · #{r.order_no}</b><S n={r.stars} /></div>
              <div className="muted small">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{r.lang === 'es' ? ' · Español' : ''}{r.status === 'hidden' ? ' · HIDDEN from the site' : ''}</div>
              {r.comment && <p className="rv-comment">{r.comment}</p>}
              {r.meals_all.length > 0 && (
                <div className="rv-loved">{r.meals_all.map((m) => <span key={m.key}>{keyLabel(m.key)} {'★'.repeat(m.stars)}</span>)}</div>
              )}
              {r.reply && draft[r.id] === undefined && <div className="rv-reply"><b>Your reply:</b> {r.reply} <button className="link" onClick={() => setDraft((x) => ({ ...x, [r.id]: r.reply }))}>Edit</button></div>}
              {(!r.reply || draft[r.id] !== undefined) && (
                <textarea className="input" rows={2} maxLength={500} placeholder="Write a public reply…" value={draft[r.id] || ''} onChange={(e) => setDraft((x) => ({ ...x, [r.id]: e.target.value }))} />
              )}
              <div className="row wrap" style={{ marginTop: 8 }}>
                {(draft[r.id] || '').trim() && <button className="btn btn-red btn-sm" disabled={busy === r.id} onClick={() => save(r.id, { reply: draft[r.id] })}>Post reply</button>}
                {r.reply && draft[r.id] === undefined && <button className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => window.confirm('Remove your reply?') && save(r.id, { reply: '' })}>Remove reply</button>}
                <button className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => save(r.id, { status: r.status === 'hidden' ? 'published' : 'hidden' })}>{r.status === 'hidden' ? 'Show again' : 'Hide (spam / rude)'}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Photos (lib/photos.js) ----------------
// Shrinks a picture on the phone before upload: the long side to `max` px, WebP (JPEG where the
// browser can't make WebP). Returns { url, w, h }.
async function shrinkImage(file, max, q = 0.82) {
  let src, w, h;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' });
    w = src.width; h = src.height;
  } catch {
    src = await new Promise((ok, bad) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => bad(new Error('read'));
      img.src = URL.createObjectURL(file);
    });
    w = src.naturalWidth; h = src.naturalHeight;
  }
  const k = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, cw, ch);
  let url = c.toDataURL('image/webp', q);
  if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', q);
  return { url, w: cw, h: ch };
}

export function PhotosTab() {
  const [list, setList] = useState(null);
  const [max, setMax] = useState(80);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const [cap, setCap] = useState({});
  const load = () => api('/api/photos?all=1').then((j) => { setList(j.photos || []); setMax(j.max || 80); }).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  if (!list) return <p className="muted">Loading…</p>;

  async function upload(files) {
    setErr('');
    const arr = [...files].filter((f) => /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    let done = 0, failed = 0;
    // New photos go first, so upload the last one first: the batch then shows in the order picked.
    for (const f of arr.slice().reverse()) {
      setProgress(`Uploading ${done + failed + 1} of ${arr.length}…`);
      try {
        let full = await shrinkImage(f, 1400);
        if (full.url.length > 2_000_000) full = await shrinkImage(f, 1200, 0.7);
        const thumb = await shrinkImage(f, 560, 0.75);
        const j = await api('/api/photos', { method: 'POST', body: { data: full.url, thumb: thumb.url, w: full.w, h: full.h, caption: captionFromFileName(f.name) } });
        setList((l) => [j.photo, ...l]);
        done += 1;
      } catch (e) {
        failed += 1;
        setErr(e && e.message && e.message !== 'read' && e.message !== 'Request failed' ? e.message : "Couldn't read one of the pictures. Try a JPG or a screenshot of it.");
      }
    }
    setProgress(done ? `✓ ${done} photo${done === 1 ? '' : 's'} added${failed ? ` · ${failed} failed` : ''}` : '');
  }
  const patch = async (id, body) => {
    setBusy(id);
    try {
      const j = await api('/api/photos', { method: 'PATCH', body: { id, ...body } });
      if (j.photos) setList(j.photos);
      else setList((l) => l.map((p) => (p.id === id ? j.photo : p)));
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this photo for good?')) return;
    setBusy(id);
    try { await api(`/api/photos?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); setList((l) => l.filter((p) => p.id !== id)); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const shown = list.filter((p) => !p.hidden).length;

  return (
    <div>
      <div className="route-head">
        <div>
          <h2 className="display sm">📸 Photos</h2>
          <p className="muted small">Food pictures for the website. The first {HOME_COUNT} show in "Fresh off the smoker" on the home page, and all of them on dinomeals.app/photos. New photos go first. Use ↑ ↓ to change the order, add a short caption if you like (for example "Smoked tri-tip, cilantro lime rice").</p>
        </div>
      </div>
      <div className="stat-row">
        <Stat label="On the site" value={shown} />
        <Stat label="Hidden" value={list.length - shown} />
        <Stat label="Space left" value={Math.max(0, max - list.length)} sub={`max ${max}`} />
      </div>
      <label className="ph-upload">
        <Camera size={30} />
        <b>Add photos</b>
        <span className="muted small">Pick from your camera roll (you can pick several; they show in the order you pick them). They're shrunk on your phone first, so it's quick. A file named like "Garlic butter shrimp.jpg" gets that as its caption.</span>
        <input type="file" accept="image/*" multiple onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      </label>
      {progress && <div className="ph-progress">{progress}</div>}
      {err && <div className="error">{err}</div>}
      {list.length === 0 && <p className="muted empty">No photos yet. Add your best plates above. 🦖</p>}
      <div className="ph-admin-grid">
        {list.map((p, i) => (
          <div className={`ph-admin ${p.hidden ? 'is-hidden' : ''}`} key={p.id}>
            <div className="pic">
              <img src={p.thumb} alt="" loading="lazy" />
              <em>{(() => { if (p.hidden) return 'Hidden'; const rank = list.filter((x, k) => k <= i && !x.hidden).length; return rank <= HOME_COUNT ? `Home #${rank}` : 'Photos page'; })()}</em>
            </div>
            <div className="body">
              <input
                className="input"
                maxLength={80}
                placeholder="Caption (optional)"
                value={cap[p.id] ?? p.caption}
                onChange={(e) => setCap((c) => ({ ...c, [p.id]: e.target.value }))}
                onBlur={() => { if (cap[p.id] !== undefined && cap[p.id] !== p.caption) patch(p.id, { caption: cap[p.id] }).then(() => setCap((c) => ({ ...c, [p.id]: undefined }))); }}
              />
              <div className="acts">
                <button className="btn btn-ghost btn-sm" aria-label="Move earlier" disabled={busy === p.id || i === 0} onClick={() => patch(p.id, { move: -1 })}>↑</button>
                <button className="btn btn-ghost btn-sm" aria-label="Move later" disabled={busy === p.id || i === list.length - 1} onClick={() => patch(p.id, { move: 1 })}>↓</button>
                <button className="btn btn-ghost btn-sm" aria-label={p.hidden ? 'Show' : 'Hide'} disabled={busy === p.id} onClick={() => patch(p.id, { hidden: !p.hidden })}>{p.hidden ? 'Show' : 'Hide'}</button>
                <button className="btn btn-ghost btn-sm" aria-label="Delete" disabled={busy === p.id} onClick={() => remove(p.id)}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
