// Grill sizzle that plays when Chef Rex pops in after an order is placed.
// Phones only allow sound that starts from a tap, so primeSizzle() runs on the
// "Place order" tap (silently unlocks the audio) and playSizzle() fires a moment
// later when the confirmation screen shows. Follows the site's sound on/off choice.
const SRC = '/sounds/sizzle.mp3';
let el = null;
let wanted = false; // playSizzle() already asked for it (don't let the prime pause it)

const soundOff = () => {
  try { return window.localStorage.getItem('dino_sound') === 'off'; } catch { return false; }
};

export function primeSizzle() {
  if (typeof window === 'undefined' || soundOff()) return;
  try {
    el = el || new Audio(SRC);
    el.preload = 'auto';
    wanted = false;
    el.muted = true;
    const p = el.play();
    if (p && p.then) p.then(() => { if (!wanted) { el.pause(); el.currentTime = 0; } el.muted = false; }).catch(() => { el.muted = false; });
    else { el.pause(); el.muted = false; }
  } catch {}
}

export function playSizzle() {
  if (typeof window === 'undefined' || soundOff()) return;
  try {
    wanted = true;
    const a = el || new Audio(SRC);
    a.muted = false;
    a.volume = 0.8;
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch {}
}
