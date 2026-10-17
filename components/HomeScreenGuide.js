// "Dino guide": full-screen walkthrough that shows customers how to add DinoMeals to their
// Home Screen. Opened from the 📲 button in SiteNav. Shows the iPhone (Safari) or Android
// (Chrome) steps for the phone it's on, in the customer's language, with an animated demo
// (lib/a2hsDemo.js). On Android Chrome, if the browser offers it, "Install now" installs directly.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TXT = {
  en: {
    bubble: 'Rawr! Put me on your Home Screen 🦖',
    sub: 'Order in one tap — DinoMeals opens like a real app. No download needed.',
    iphone: 'iPhone', android: 'Android',
    hintIos: 'The Share button is down here',
    hintAndroid: 'In Chrome, the ⋮ menu is at the top right',
    install: 'Install now',
    done: 'Got it!',
    close: 'Close',
  },
  es: {
    bubble: '¡Rawr! Ponme en tu pantalla de inicio 🦖',
    sub: 'Ordena con un toque — DinoMeals abre como una app. Sin descargas.',
    iphone: 'iPhone', android: 'Android',
    hintIos: 'El botón Compartir está aquí abajo',
    hintAndroid: 'En Chrome, el menú ⋮ está arriba a la derecha',
    install: 'Instalar ahora',
    done: '¡Entendido!',
    close: 'Cerrar',
  },
};

export function detectPhone() {
  if (typeof navigator === 'undefined') return { platform: 'ios', phone: false };
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  return { platform: android ? 'android' : 'ios', phone: ios || android, iphone: /iPhone|iPod/.test(ua) };
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

// Chrome on Android fires this when the app can be installed; keep it for the "Install now" button.
let deferredPrompt = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export default function HomeScreenGuide({ open, onClose, lang = 'en' }) {
  const t = TXT[lang] || TXT.en;
  const host = useRef(null);
  const demo = useRef(null);
  const [device] = useState(detectPhone);
  const [platform, setPlatform] = useState(device.platform);
  const [canInstall, setCanInstall] = useState(false);

  // Start / stop the animated demo.
  useEffect(() => {
    if (!open || !host.current) return undefined;
    let alive = true;
    import('../lib/a2hsDemo').then(({ makeDemo }) => {
      if (!alive || !host.current) return;
      host.current.innerHTML = '';
      demo.current = makeDemo(host.current, { platform, lang, icon: '/icon-192.png' });
    });
    return () => {
      alive = false;
      if (demo.current) demo.current.stop();
      demo.current = null;
    };
  }, [open, platform, lang]);

  // Size the demo phone to the screen (it's drawn at 260×540 and scaled).
  const [k, setK] = useState(0.8);
  useEffect(() => {
    if (!open) return undefined;
    const fit = () => setK(Math.max(0.5, Math.min(0.95, (window.innerHeight * 0.5) / 540, (window.innerWidth - 56) / 260)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [open]);

  // Esc closes; lock page scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    setCanInstall(!!deferredPrompt);
    const onKey = (e) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    deferredPrompt = null;
    setCanInstall(false);
    onClose();
  };

  const showHint = device.phone && (platform === 'android' || device.iphone);

  return createPortal(
    <>
    <div className="a2hs" role="dialog" aria-modal="true" aria-label={t.bubble}>
      <button className="a2hs-x" onClick={onClose} aria-label={t.close}>✕</button>
      <div className="a2hs-in">
        <div className="a2hs-mascot">
          <span className="a2hs-mk"><img src="/logo-mark.png" alt="" /></span>
          <div className="a2hs-bub">{t.bubble}</div>
        </div>
        <p className="a2hs-sub">{t.sub}</p>
        <div className="a2hs-seg" role="group">
          <button className={platform === 'ios' ? 'on' : ''} onClick={() => setPlatform('ios')}>{t.iphone}</button>
          <button className={platform === 'android' ? 'on' : ''} onClick={() => setPlatform('android')}>{t.android}</button>
        </div>
        <div className="a2hs-phone" style={{ width: 260 * k, height: 540 * k, '--k': k }}><div ref={host} className="a2hs-demo" /></div>
        {platform === 'android' && canInstall ? (
          <button className="btn btn-red btn-block a2hs-btn" onClick={install}>📲 {t.install}</button>
        ) : (
          <button className="btn btn-red btn-block a2hs-btn" onClick={onClose}>{t.done}</button>
        )}
      </div>
    </div>
    {showHint && (
      <div className="a2hs-hint">
        <span>{platform === 'android' ? '↗' : '↓'}</span>
        {platform === 'android' ? t.hintAndroid : t.hintIos}
      </div>
    )}
    </>,
    document.body
  );
}
