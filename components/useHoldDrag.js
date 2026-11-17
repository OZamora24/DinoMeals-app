// Press-and-hold, then drag to reorder (admin orders, "My order" sort). No arrows.
//  - Hold an order card still for ~0.35 s: it lifts (and the phone buzzes if it can).
//  - Drag it over another card: the list reorders live. Let go to save.
//  - Moving before the hold finishes is a normal scroll, so the page still scrolls on a phone.
//  - Taps on buttons, links and inputs inside a card never start a drag.
//  - Near the top/bottom of the screen the page scrolls while dragging.
import { useEffect, useRef, useState } from 'react';
import { moveId } from '../lib/orderSort';

const HOLD_MS = 350;
const SLOP = 10; // px of movement allowed during the hold

export default function useHoldDrag({ enabled, ids, onDrop }) {
  const [drag, setDrag] = useState(null); // { id, list }
  const s = useRef(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  const stop = () => {
    const cur = s.current;
    if (!cur) return;
    clearTimeout(cur.timer);
    clearInterval(cur.scroller);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('touchmove', onTouch);
    window.removeEventListener('contextmenu', onMenu, true);
    document.body.classList.remove('is-dragging');
    s.current = null;
  };

  function onTouch(e) { if (s.current && s.current.active) e.preventDefault(); }
  function onMenu(e) { if (s.current) e.preventDefault(); } // long-press menu on phones

  function onMove(e) {
    const cur = s.current;
    if (!cur) return;
    cur.x = e.clientX; cur.y = e.clientY;
    if (!cur.active) {
      if (Math.hypot(e.clientX - cur.x0, e.clientY - cur.y0) > SLOP) stop(); // it's a scroll
      return;
    }
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const card = el && el.closest('[data-oid]');
    if (!card || card.dataset.oid === cur.id) return;
    const r = card.getBoundingClientRect();
    const grid = card.parentElement.getBoundingClientRect();
    const sideBySide = r.width < grid.width * 0.7; // 2–3 columns on a computer
    const after = sideBySide ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
    const next = moveId(cur.list, cur.id, card.dataset.oid, after);
    if (next.join() !== cur.list.join()) { cur.list = next; setDrag({ id: cur.id, list: next }); }
  }

  function onUp() {
    const cur = s.current;
    if (cur && cur.active) {
      const changed = cur.list.join() !== cur.start.join();
      setDrag(null);
      if (changed) dropRef.current(cur.list);
    }
    stop();
  }
  function onCancel() { if (s.current && s.current.active) setDrag(null); stop(); }

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const bind = (id) => (enabled ? {
    'data-oid': id,
    onPointerDown: (e) => {
      if (e.button > 0 || s.current) return;
      if (e.target.closest('button, a, input, select, textarea, label, [contenteditable]')) return;
      const cur = { id, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, active: false, list: ids.slice(), start: ids.slice() };
      cur.timer = setTimeout(() => {
        cur.active = true;
        document.body.classList.add('is-dragging');
        try { navigator.vibrate && navigator.vibrate(15); } catch {}
        setDrag({ id, list: cur.list });
        cur.scroller = setInterval(() => { // auto-scroll near the edges
          const edge = 90;
          if (cur.y < edge) window.scrollBy(0, -14);
          else if (cur.y > window.innerHeight - edge) window.scrollBy(0, 14);
        }, 16);
      }, HOLD_MS);
      s.current = cur;
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('touchmove', onTouch, { passive: false });
      window.addEventListener('contextmenu', onMenu, true);
    },
  } : { 'data-oid': id });

  return { drag, bind, order: drag ? drag.list : ids };
}
