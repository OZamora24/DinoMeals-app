// 🔔 button in the top bar: customers tap it to get promo / reminder notifications on their phone.
// Hidden where the phone can't do it (e.g. iPhone in a Safari tab: add DinoMeals to the Home Screen first).
import { useEffect, useState } from 'react';
import { customerPushState, enableCustomerPush, disableCustomerPush, healCustomerPush, pushSupported } from '../lib/customerPush';

const SEEN = 'dino_bell_seen';
const TXT = {
  en: {
    on: 'Notifications are on. We will message you about promos and reminders 🦖',
    off: 'Notifications are off.',
    blocked: 'Notifications are blocked. Turn them on for DinoMeals in your phone settings, then tap the bell again.',
    fail: 'Could not turn notifications on. Please try again.',
    label: 'Notifications',
  },
  es: {
    on: 'Notificaciones activadas. Te avisaremos de promos y recordatorios 🦖',
    off: 'Notificaciones desactivadas.',
    blocked: 'Las notificaciones están bloqueadas. Actívalas para DinoMeals en los ajustes de tu teléfono y toca la campana otra vez.',
    fail: 'No se pudieron activar las notificaciones. Intenta de nuevo.',
    label: 'Notificaciones',
  },
};

export default function NotifyBell({ lang = 'en' }) {
  const t = TXT[lang] || TXT.en;
  const [state, setState] = useState(null); // null until we know
  const [msg, setMsg] = useState('');
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (!pushSupported() || new URLSearchParams(window.location.search).get('admin') === '1') return;
    customerPushState().then((s) => {
      setState(s);
      if (s === 'on') healCustomerPush(lang);
    });
    try { setFresh(localStorage.getItem(SEEN) !== '1'); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!msg) return undefined;
    const id = setTimeout(() => setMsg(''), 4200);
    return () => clearTimeout(id);
  }, [msg]);

  if (!state || state === 'unsupported') return null;

  async function tap() {
    try { localStorage.setItem(SEEN, '1'); } catch {}
    setFresh(false);
    if (state === 'on') {
      await disableCustomerPush();
      setState('off');
      setMsg(t.off);
      return;
    }
    const r = await enableCustomerPush(lang);
    if (r.ok) { setState('on'); setMsg(t.on); return; }
    if (r.reason === 'denied') { setState('blocked'); setMsg(t.blocked); return; }
    setMsg(t.fail);
  }

  return (
    <>
      <button className={`nav-bell ${state === 'on' ? 'on' : ''} ${fresh ? 'fresh' : ''}`} onClick={tap} aria-label={t.label} aria-pressed={state === 'on'} title={t.label}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
          {state !== 'on' && <path d="M4 4l16 16" />}
        </svg>
      </button>
      {msg && <div className="nav-bell-toast" role="status">{msg}</div>}
    </>
  );
}
