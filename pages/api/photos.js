import { listPhotos, insertPhoto, updatePhoto, deletePhoto, countPhotos } from '../../lib/db';
import { isValidSession } from '../../lib/adminSession';
import { cleanUpload, cleanCaption, sortPhotos, publicPhoto, moveSort, MAX_PHOTOS } from '../../lib/photos';
import { photoList, clearPhotoCache } from '../../lib/photosData';

// Food photos (lib/photos.js).
//   GET                         -> public: visible photos in order
//   GET ?all=1                  -> admin: every photo (hidden too)
//   POST { data, thumb, w, h, caption }   -> admin: upload one (already shrunk on the phone)
//   PATCH { id, caption?, hidden? } | { id, move: -1|1 } -> admin
//   DELETE ?id=                 -> admin
export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const adminView = (p) => ({ ...publicPhoto(p), hidden: !!p.hidden, sort: p.sort || 0, created_at: p.created_at });

export default async function handler(req, res) {
  try {
    const admin = isValidSession(req);
    if (req.method === 'GET') {
      if (req.query.all) {
        if (!admin) return res.status(401).json({ error: 'Not logged in' });
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ photos: sortPhotos(await listPhotos({ includeHidden: true })).map(adminView), max: MAX_PHOTOS });
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({ photos: await photoList() });
    }
    if (!admin) return res.status(401).json({ error: 'Not logged in' });
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') {
      if ((await countPhotos()) >= MAX_PHOTOS) return res.status(400).json({ error: `Limit is ${MAX_PHOTOS} photos. Delete some old ones first.` });
      const c = cleanUpload(req.body || {});
      if (c.error) return res.status(400).json({ error: c.error === 'too_big' ? 'That picture is too big.' : 'That file is not a picture.' });
      // New photos go first: one less than the current lowest sort number.
      const all = await listPhotos({ includeHidden: true });
      const low = all.reduce((m, p) => Math.min(m, p.sort || 0), 0);
      const saved = await insertPhoto({ ...c.photo, sort: low - 10 });
      clearPhotoCache();
      return res.status(200).json({ photo: adminView(saved) });
    }
    if (req.method === 'PATCH') {
      const b = req.body || {};
      const id = String(b.id || '');
      if (!id) return res.status(400).json({ error: 'Missing photo' });
      if (b.move === 1 || b.move === -1) {
        const changes = moveSort(await listPhotos({ includeHidden: true }), id, b.move);
        for (const ch of changes) await updatePhoto(ch.id, { sort: ch.sort });
        clearPhotoCache();
        return res.status(200).json({ photos: sortPhotos(await listPhotos({ includeHidden: true })).map(adminView) });
      }
      const patch = {};
      if ('caption' in b) patch.caption = cleanCaption(b.caption);
      if ('hidden' in b) patch.hidden = !!b.hidden;
      const saved = await updatePhoto(id, patch);
      if (!saved) return res.status(404).json({ error: 'Not found' });
      clearPhotoCache();
      return res.status(200).json({ photo: adminView(saved) });
    }
    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'Missing photo' });
      await deletePhoto(id);
      clearPhotoCache();
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('photos api', e);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
