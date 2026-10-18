import { buildVCard } from '../../lib/vcard';

// GET /api/contact → DinoMeals.vcf ("Add DinoMeals to contacts" button).
export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="DinoMeals.vcf"');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(buildVCard());
}
