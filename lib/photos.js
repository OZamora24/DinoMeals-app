// Food photos (Juan, Nov 2026): Juan uploads pictures in Admin → Photos, customers see them in the
// "Fresh off the smoker" strip on the home page and on /photos.
//  - The phone shrinks each picture before upload (FULL_PX long side + a THUMB_PX thumbnail).
//  - Pictures are saved in the database and served from /api/photo/<id> with long caching.
// Pure helpers (no database) shared by the server, the pages and the tests.

export const MAX_PHOTOS = 80;
export const FULL_PX = 1400;
export const THUMB_PX = 560;
export const MAX_FULL_BYTES = 1.6 * 1024 * 1024; // decoded size limits (base64 is ~33% bigger)
export const MAX_THUMB_BYTES = 350 * 1024;
export const MAX_CAPTION = 80;
export const HOME_COUNT = 10;

const DATA_URL = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/;

// "data:image/webp;base64,...." -> { mime, b64, bytes } or null
export function parseDataUrl(s) {
  const m = DATA_URL.exec(String(s || ''));
  if (!m) return null;
  const b64 = m[2];
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return { mime: m[1], b64, bytes: Math.floor((b64.length * 3) / 4) - pad };
}

// A caption from the file name ("03 Garlic butter shrimp.jpg" -> "Garlic butter shrimp"), but not from
// camera names like IMG_1234.jpg, PXL_2026…, image.jpg or Screenshot ….
export function captionFromFileName(name) {
  const base = String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/^\s*\d{1,3}[\s._-]+/, '').replace(/[_]+/g, ' ').trim();
  if (!base || /^(img|pxl|dsc|dscn|mvimg|image|photo|picture|screenshot|screen shot|whatsapp|signal|fb_img|received)\b/i.test(base)) return '';
  if (/^[\d\s._-]+$/.test(base) || /^[0-9a-f-]{8,}$/i.test(base) || /^(?=[a-z]*\d)[0-9a-f]{6,}[-_ ]/i.test(base) || !/[a-z]{3,}/i.test(base)) return '';
  return cleanCaption(base);
}

export const cleanCaption = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION);

// Checks an upload from Admin. Returns { error } or { photo } ready to save.
export function cleanUpload(body) {
  const full = parseDataUrl(body && body.data);
  const thumb = parseDataUrl(body && body.thumb);
  if (!full || !thumb) return { error: 'bad_image' };
  if (full.bytes > MAX_FULL_BYTES || thumb.bytes > MAX_THUMB_BYTES) return { error: 'too_big' };
  const w = Math.round(Number(body.w)), h = Math.round(Number(body.h));
  if (!(w > 0 && h > 0 && w <= 4000 && h <= 4000)) return { error: 'bad_size' };
  return {
    photo: { caption: cleanCaption(body.caption), mime: full.mime, thumb_mime: thumb.mime, data: full.b64, thumb: thumb.b64, w, h, hidden: false },
  };
}

// Order shown everywhere: Juan's order (sort, low first), then newest first.
export const sortPhotos = (list = []) =>
  list.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0) || String(b.created_at).localeCompare(String(a.created_at)));

// What anyone may see about a photo (image URLs carry a version so the CDN can cache forever).
export function publicPhoto(p) {
  const v = Date.parse(p.created_at) || 0;
  return {
    id: p.id,
    caption: p.caption || '',
    w: p.w,
    h: p.h,
    src: `/api/photo/${p.id}?v=${v}`,
    thumb: `/api/photo/${p.id}?s=t&v=${v}`,
  };
}

// New sort numbers after Juan moves a photo up (-1) or down (+1). Returns [{ id, sort }] that changed.
export function moveSort(list, id, dir) {
  const ordered = sortPhotos(list);
  const i = ordered.findIndex((p) => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ordered.length) return [];
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  return ordered.map((p, k) => ({ id: p.id, sort: (k + 1) * 10, was: p.sort })).filter((x) => x.sort !== x.was).map(({ id: pid, sort }) => ({ id: pid, sort }));
}
