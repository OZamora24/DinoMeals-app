// 🧾 "My orders" — the last few orders placed (or opened) on this phone, with live
// status. Saved in localStorage only (no login); each opens its private order page.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { readMyOrders, VIEW_TXT } from '../lib/orderView';
import { prettyDate, money, addDays, dateKey, laNow } from '../lib/menu';

const CHIP = { cooking: 'now', unpaid: 'wait', quote: 'wait', paid: 'ok', ready: 'go', picked_up: 'ok', delivered: 'ok', cancelled: 'off' };

function summary(o, lang) {
  const parts = [];
  if (o.meal_count) parts.push(`${o.meal_count} ${lang === 'es' ? 'comidas' : 'meals'}`);
  if (o.lb_total) parts.push(`${o.lb_total} lb`);
  return [parts.join(' + '), o.total != null ? money(o.total) : ''].filter(Boolean).join(' · ');
}

export default function MyOrders({ lang = 'en' }) {
  const x = VIEW_TXT[lang] || VIEW_TXT.en;
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState({});

  const load = useCallback(() => setList(readMyOrders()), []);
  useEffect(() => {
    load();
    window.addEventListener('dino-orders', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('dino-orders', load);
      window.removeEventListener('storage', load);
    };
  }, [load]);

  // Fresh status each time the sheet opens.
  useEffect(() => {
    if (!open || !list.length) return undefined;
    let alive = true;
    fetch(`/api/track?t=${list.map((o) => o.token).join(',')}`)
      .then((r) => r.json())
      .then((j) => alive && setLive(Object.fromEntries((j.orders || []).map((o) => [o.token, o]))))
      .catch(() => {});
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, list]);

  if (!list.length) return null;
  // Red dot while an order is still coming up (through the day after cook day, for delivery).
  const today = dateKey(laNow());
  const active = list.some((o) => o.cook_date && addDays(o.cook_date, 1) >= today && !['picked_up', 'delivered', 'cancelled'].includes(live[o.token]?.track));

  return (
    <>
      <button className={`nav-orders${active ? ' live' : ''}`} onClick={() => setOpen(true)} aria-label={x.my_orders} title={x.my_orders}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.8h12v18.4l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></svg>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="mo-wrap" onClick={() => setOpen(false)}>
          <div className="mo-sheet" role="dialog" aria-modal="true" aria-label={x.my_orders} onClick={(e) => e.stopPropagation()}>
            <div className="mo-grab" />
            <div className="mo-head">
              <h3>{x.my_orders}</h3>
              <button className="mo-x" onClick={() => setOpen(false)} aria-label={x.close}>✕</button>
            </div>
            {list.map((o) => {
              const v = { ...o, ...(live[o.token] || {}) };
              const k = live[o.token]?.track;
              return (
                <Link key={o.token} href={`/o/${o.token}`} className="mo-row" onClick={() => setOpen(false)}>
                  <div>
                    <b>#{v.order_no}</b> · {prettyDate(v.cook_date, lang)}
                    <small>{summary(v, lang)}</small>
                  </div>
                  {k && <span className={`mo-chip ${CHIP[k] || ''}`}>{x.chip[k]}</span>}
                </Link>
              );
            })}
            <p className="mo-hint">{x.my_orders_hint}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
