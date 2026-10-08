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
