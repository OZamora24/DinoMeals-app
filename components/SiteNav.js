import { useEffect, useState } from 'react';
import Link from 'next/link';
import HomeScreenGuide, { isStandalone } from './HomeScreenGuide';
import MyOrders from './MyOrders';

const SEEN = 'dino_a2hs_seen';
const store = {
  get: (k) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { window.localStorage.setItem(k, v); } catch {} },
};

export default function SiteNav({ lang, setLang, t, cta = true, spin = false }) {
  // 📲 "Get the app" button → Dino guide. Hidden when already opened from the Home Screen.
  const [showApp, setShowApp] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [guide, setGuide] = useState(false);
  const [admin, setAdmin] = useState(true);
  useEffect(() => {
    const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1';
    setAdmin(isAdmin);
    if (isStandalone() || isAdmin) return;
    setShowApp(true);
    setFresh(store.get(SEEN) !== '1');
  }, []);
  const openGuide = () => {
    setGuide(true);
    setFresh(false);
    store.set(SEEN, '1');
  };
  return (
    <header className="nav">
      <Link href="/" className="nav-brand" aria-label="DinoMeals home">
        <span className={`nav-badge${spin ? ' spin' : ''}`}><img src="/logo-mark.png" alt="" /></span>
        <span className="nav-name">DINO<em>MEALS</em></span>
      </Link>
      <div className="nav-right">
        {!admin && <MyOrders lang={lang} />}
        {showApp && (
          <button className={`nav-app ${fresh ? 'fresh' : ''}`} onClick={openGuide} aria-label={lang === 'es' ? 'Agregar a la pantalla de inicio' : 'Add to Home Screen'} title={lang === 'es' ? 'Agregar a inicio' : 'Get the app'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.6" /><path d="M12 7.5v7M9 11.8l3 3 3-3" /><path d="M10.5 18.5h3" /></svg>
          </button>
        )}
        <div className="lang-toggle" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
        </div>
        {cta && (
          <Link href="/order" className="btn btn-red btn-sm">{t('order_now')}</Link>
        )}
      </div>
      <HomeScreenGuide open={guide} onClose={() => setGuide(false)} lang={lang} />
    </header>
  );
}
