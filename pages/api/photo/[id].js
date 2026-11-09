import { photoImage } from '../../../lib/db';
import { isValidSession } from '../../../lib/adminSession';

// One food photo: /api/photo/<id>?v=<version> (full) or ?s=t (thumbnail).
// The URL carries a version, so browsers and the CDN can keep it for a year.
export default async function handler(req, res) {
  try {
    const id = String(req.query.id || '').slice(0, 64);
    const img = id ? await photoImage(id, req.query.s === 't') : null;
    if (!img || !img.b64 || (img.hidden && !isValidSession(req))) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).end();
    }
    res.setHeader('Content-Type', img.mime || 'image/jpeg');
    res.setHeader('Cache-Control', img.hidden ? 'private, no-store' : 'public, max-age=31536000, s-maxage=31536000, immutable');
    return res.status(200).send(Buffer.from(img.b64, 'base64'));
  } catch (e) {
    console.error('photo', e);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).end();
  }
}
