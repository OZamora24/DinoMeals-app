// Server side: the visible photo list, cached for a minute per server.
import { listPhotos } from './db';
import { sortPhotos, publicPhoto, HOME_COUNT } from './photos';

const TTL = 60 * 1000;
export function clearPhotoCache() { globalThis.__dinoPhotoCache = null; }

export async function photoList() {
  const c = globalThis.__dinoPhotoCache;
  if (c && Date.now() - c.at < TTL) return c.value;
  let list = [];
  try { list = await listPhotos(); } catch (e) { console.error('photos', e?.message); }
  const value = sortPhotos(list).map(publicPhoto);
  globalThis.__dinoPhotoCache = { at: Date.now(), value };
  return value;
}

// Home page strip: the first few + how many there are.
export async function photoProps(n = HOME_COUNT) {
  const all = await photoList();
  return { items: all.slice(0, n), total: all.length };
}
