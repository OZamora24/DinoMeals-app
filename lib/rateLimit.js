// Best-effort in-memory rate limiter. State is per server instance, so it
// slows brute-force and spam but is not a hard global cap.
const buckets = () => (globalThis.__dinoRate ||= new Map());

export function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.socket?.remoteAddress || 'unknown';
}

// Returns true if the request is allowed.
export function rateLimit(req, name, max, windowMs) {
  const map = buckets();
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const hits = (map.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    map.set(key, hits);
    return false;
  }
  hits.push(now);
  map.set(key, hits);
  if (map.size > 5000) for (const [k, v] of map) if (!v.length || now - v[v.length - 1] > windowMs) map.delete(k);
  return true;
}
