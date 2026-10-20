import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import '@fontsource/anton/latin-400.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '../styles/globals.css';
import '../styles/splash-extra.css';
import SplashScreen from '../components/SplashScreen';
import FossilTransition from '../components/FossilTransition';
import { PromoModal } from '../components/PromoPopup';

// Splash rules
//  - First visit: "Tap to enter" gate, then the full splash with the
//    Sizzle Thunder Roar (phones block sound until a tap, so the tap starts both).
//  - Opened from the home-screen app: full splash once per launch (sound if allowed).
//  - Return visits: quick, silent ~1s splash.
//  - Kitchen admin: no splash at all.
//  - Mute choice is remembered.
const TIMING = {
  full: { min: 2600, max: 4000 },
  quick: { min: 950, max: 2200 },
};
const FADE_MS = 700;
const SOUND_SRC = '/sounds/splash.mp3';

// Fossil transition (home → menu): plays the first time per visit that a customer taps
// a link to /order from the home page. Skipped for reduced motion. Timeline in ms.
const FX = { navigateAt: 1500, revealAt: 1750, revealMs: 700, maxWait: 4000 };
const FX_KEY = 'dino_fossil';
const INTRO = { holdMs: 1300, fadeMs: 450 }; // dino-logo moment shown after tapping a notification
const FX_SOUND = '/sounds/fossil.mp3';

const safe = (fn, fallback = null) => {
  try { return fn(); } catch { return fallback; }
};
const local = {
  get: (k) => safe(() => window.localStorage.getItem(k)),
  set: (k, v) => safe(() => window.localStorage.setItem(k, v)),
};
const session = {
  get: (k) => safe(() => window.sessionStorage.getItem(k)),
  set: (k, v) => safe(() => window.sessionStorage.setItem(k, v)),
};

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAdmin = router.pathname.startsWith('/admin');
  const [phase, setPhase] = useState(isAdmin ? 'gone' : 'pre'); // pre | gate | visible | leaving | gone
  const [mode, setMode] = useState('full'); // full | quick
  const [muted, setMuted] = useState(false);
  const audio = useRef(null);
  const [fx, setFx] = useState(null); // null | run | reveal
  const fxBusy = useRef(false);
  const [intro, setIntro] = useState(null); // null | in | out  (the dino logo shown after a notification tap)
  const [promo, setPromo] = useState(null); // message card shown after tapping a notification
  const pendingPromo = useRef(null); // id from /?promo=<id> or a notification tap, waiting for the splash to finish

  const label = router.pathname === '/order' ? 'LOADING THE MENU' : 'FIRING UP THE SMOKER';

  const getAudio = () => {
    if (!audio.current) {
      audio.current = new Audio(SOUND_SRC);
      audio.current.preload = 'auto';
    }
    return audio.current;
  };

  // Decide which splash this visit gets.
  useEffect(() => {
    if (isAdmin) return;
    if (new URLSearchParams(window.location.search).get('admin') === '1') {
      setPhase('gone');
      return;
    }
    const isMuted = local.get('dino_sound') === 'off';
    setMuted(isMuted);
    const seen = local.get('dino_seen') === '1';
    const standalone =
      safe(() => window.matchMedia('(display-mode: standalone)').matches, false) || window.navigator.standalone === true;
    const launched = session.get('dino_launch') === '1';

    if (!seen) {
      if (!isMuted) getAudio().load();
      setMode('full');
      setPhase('gate');
      return;
    }
    if (standalone && !launched) {
      session.set('dino_launch', '1');
      setMode('full');
      if (!isMuted) getAudio().play().catch(() => {}); // plays only if the browser allows it
      setPhase('visible');
      return;
    }
    setMode('quick');
    setPhase('visible');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timers: leave once the minimum time has passed and the page has loaded.
  useEffect(() => {
    if (phase !== 'visible') return;
    const { min, max } = TIMING[mode];
    let minDone = false;
    let loaded = document.readyState === 'complete';
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      clearTimeout(minT);
      clearTimeout(maxT);
      if (mode === 'full') local.set('dino_seen', '1');
      setPhase('leaving');
    };
    const tryLeave = () => minDone && loaded && leave();
    const onLoad = () => {
      loaded = true;
      tryLeave();
    };
    const minT = setTimeout(() => {
      minDone = true;
      tryLeave();
    }, min);
    const maxT = setTimeout(leave, max);
    if (!loaded) window.addEventListener('load', onLoad);
    return () => {
      clearTimeout(minT);
      clearTimeout(maxT);
      window.removeEventListener('load', onLoad);
    };
  }, [phase, mode]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const t = setTimeout(() => setPhase('gone'), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Fossil transition: catch taps on links to /order from the home page before Next's <Link> does.
  useEffect(() => {
    if (isAdmin) return undefined;
    const onClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (window.location.pathname !== '/') return;
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== '/order') return;
      if (fxBusy.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (session.get(FX_KEY) === '1') return;
      if (safe(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, false)) return;
      e.preventDefault();
      e.stopPropagation();
      session.set(FX_KEY, '1');
      fxBusy.current = true;
      const href = url.pathname + url.search + url.hash;
      const start = Date.now();
      setFx('run');
      // Stomp/crack sound for the transition. This runs inside the customer's tap, so phones allow it.
      if (local.get('dino_sound') !== 'off') safe(() => new Audio(FX_SOUND).play().catch(() => {}));
      setTimeout(async () => {
        await Promise.race([
          router.push(href).catch(() => {}),
          new Promise((r) => setTimeout(r, FX.maxWait)),
        ]);
        setTimeout(() => {
          setFx('reveal');
          setTimeout(() => {
            setFx(null);
            fxBusy.current = false;
          }, FX.revealMs);
        }, Math.max(0, FX.revealAt - (Date.now() - start)));
      }, FX.navigateAt);
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Tapping a notification opens /?promo=<id> (or messages the open app): play the dino transition,
  // then show the message as a pop-up. Waits for the splash to finish first.
  const startPromo = async (id) => {
    if (!id || fxBusy.current) return;
    let data = null;
    try {
      const r = await fetch(`/api/promo?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (r.ok) data = (await r.json()).promo;
    } catch {}
    if (!data) return;
    const reduced = safe(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, false);
    if (reduced) { setPromo(data); return; }
    // Just the dino logo (no footprints, no stomp sound): it pops in, holds a moment, then fades out
    // to reveal the message card that is already waiting underneath.
    fxBusy.current = true;
    setIntro('in');
    setTimeout(() => setPromo(data), INTRO.holdMs - 150);
    setTimeout(() => {
      setIntro('out');
      setTimeout(() => { setIntro(null); fxBusy.current = false; }, INTRO.fadeMs);
    }, INTRO.holdMs);
  };
  useEffect(() => {
    if (isAdmin) return undefined;
    const id = new URLSearchParams(window.location.search).get('promo');
    if (id) {
      pendingPromo.current = id;
      safe(() => {
        const u = new URL(window.location.href);
        u.searchParams.delete('promo');
        window.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      });
    }
    const onMsg = (e) => {
      if (e.data && e.data.type === 'dino-promo-open' && e.data.id) {
        pendingPromo.current = e.data.id;
        if (phaseRef.current === 'gone') { const next = pendingPromo.current; pendingPromo.current = null; startPromo(next); }
      }
    };
    safe(() => navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', onMsg));
    return () => safe(() => navigator.serviceWorker && navigator.serviceWorker.removeEventListener('message', onMsg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
    if (phase === 'gone' && pendingPromo.current) {
      const id = pendingPromo.current;
      pendingPromo.current = null;
      startPromo(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const enter = (withSound) => {
    if (withSound && !muted) {
      const a = getAudio();
      a.currentTime = 0;
      a.play().catch(() => {});
    }
    if (!withSound) {
      setMuted(true);
      local.set('dino_sound', 'off');
    }
    setPhase('visible');
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    local.set('dino_sound', next ? 'off' : 'on');
    if (next && audio.current) audio.current.pause();
  };

  const hidden = phase === 'pre' || phase === 'gate' || phase === 'visible';

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>DinoMeals — Meal Prep</title>
        {/* Admin gets its own install file so a home-screen icon opens /admin, not the customer home page. */}
        <link rel="manifest" href={isAdmin ? '/admin-manifest.json' : '/manifest.json'} />
        <meta name="apple-mobile-web-app-title" content={isAdmin ? 'Kitchen' : 'DinoMeals'} />
      </Head>
      <div className={hidden ? 'app-hidden' : 'app-shown'}>
        <Component {...pageProps} />
      </div>
      <FossilTransition phase={fx} />
      {promo && <PromoModal promo={promo} onClose={() => setPromo(null)} />}
      {intro && (
        <div className={`promo-intro ${intro}`} aria-hidden="true">
          <span className="nav-badge xl spin"><img src="/logo-mark.png" alt="" /></span>
        </div>
      )}
      {phase !== 'gone' && (
        <SplashScreen
          phase={phase}
          mode={mode}
          muted={muted}
          label={label}
          onEnter={enter}
          onToggleMute={toggleMute}
        />
      )}
    </>
  );
}
