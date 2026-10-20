// Logs the kitchen out after 30 minutes with no taps, clicks, keys or scrolling.
// A 60-second "Still there?" warning comes first. Background order polling does NOT count as
// activity (otherwise the page would never log out). New-order push notifications keep working
// after a logout; only the in-page chime stops until you log in again.
import { useEffect, useRef, useState } from 'react';

export const IDLE_LIMIT_MS = 30 * 60 * 1000;
export const IDLE_WARN_MS = 60 * 1000;

export default function IdleLogout({ active, onLogout, limit = IDLE_LIMIT_MS, warn = IDLE_WARN_MS }) {
  const last = useRef(Date.now());
  const warning = useRef(false);
  const [left, setLeft] = useState(null); // seconds until logout while the warning shows

  useEffect(() => {
    if (!active) return undefined;
    last.current = Date.now();
    warning.current = false;
    setLeft(null);
    const bump = () => { if (!warning.current) last.current = Date.now(); };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    let done = false;
    const tick = () => {
      if (done) return;
      const idle = Date.now() - last.current;
      if (idle >= limit) {
        done = true;
        fetch('/api/logout', { method: 'POST' }).catch(() => {}).finally(() => onLogout());
        return;
      }
      if (idle >= limit - warn) {
        warning.current = true;
        setLeft(Math.max(1, Math.ceil((limit - idle) / 1000)));
      } else if (warning.current) {
        warning.current = false;
        setLeft(null);
      }
    };
    const id = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick); // a phone that slept: decide as soon as it wakes
    return () => {
      done = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [active, limit, warn, onLogout]);

  if (!active || left == null) return null;
  return (
    <div className="idle-warn" role="alertdialog" aria-live="assertive">
      <span>Still there? Logging out in <b>{left}s</b> because of inactivity.</span>
      <button className="btn btn-red btn-sm" onClick={() => { last.current = Date.now(); warning.current = false; setLeft(null); }}>Stay logged in</button>
    </div>
  );
}
