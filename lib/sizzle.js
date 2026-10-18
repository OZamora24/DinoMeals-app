// Grill sizzle that plays when Chef Rex pops in after an order is placed.
// Phones only allow sound that starts from a tap, so primeSizzle() runs on the
// "Place order" tap: it unlocks an AudioContext and decodes the sound while the order
// is being sent. playSizzle() then starts the already-decoded sound the instant Chef Rex
// shows up (Web Audio has no seek/buffering lag, unlike re-playing an <audio> element).
// Follows the site's sound on/off choice.
const SRC = '/sounds/sizzle.mp3';
const VOLUME = 0.8; // the file peaks above 1.0, so keep headroom to avoid crackle
let ctx = null;
let buf = null;
let loading = null;

const soundOff = () => {
  try { return window.localStorage.getItem('dino_sound') === 'off'; } catch { return false; }
};

function getCtx() {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

function load() {
  if (buf) return Promise.resolve(buf);
  if (loading) return loading;
  loading = fetch(SRC)
    .then((r) => r.arrayBuffer())
    .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then((b) => { buf = b; return b; })
    .catch(() => { loading = null; return null; });
  return loading;
}

function startBuffer(c, b) {
  try { if (c.state === 'suspended') c.resume(); } catch {}
  const src = c.createBufferSource();
  src.buffer = b;
  const g = c.createGain();
  g.gain.value = VOLUME;
  src.connect(g);
  g.connect(c.destination);
  src.start(0);
}

// Call from inside the Place order tap.
export function primeSizzle() {
  if (typeof window === 'undefined' || soundOff()) return;
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    // a one-sample silent blip finishes the iOS unlock
    const blip = c.createBufferSource();
    blip.buffer = c.createBuffer(1, 1, 22050);
    blip.connect(c.destination);
    blip.start(0);
    load();
  } catch {}
}

export function playSizzle() {
  if (typeof window === 'undefined' || soundOff()) return;
  try {
    const c = getCtx();
    if (c && buf) return startBuffer(c, buf);
    if (c && loading) {
      loading.then((b) => { if (b) startBuffer(c, b); });
      return undefined;
    }
    // never primed (e.g. the confirmation was reopened): best effort with a plain audio element
    const a = new Audio(SRC);
    a.volume = VOLUME;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch {}
  return undefined;
}
