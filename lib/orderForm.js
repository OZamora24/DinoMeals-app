// Pure helpers + constants shared by the order page and its components.
export const DRAFT_KEY = 'dinoDraft';
export const emptyInfo = {
  name: '', phone: '', email: '', fulfillment: 'pickup', address: '', zip: '', delivery_notes: '',
  payment_method: '', diet: [], allergy_notes: '', notes: '',
};

export function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function sumMacros(parts) {
  if (parts.some((p) => !p || p.cal == null || p.cal === '')) return null;
  return parts.reduce(
    (a, p) => ({ cal: a.cal + +p.cal, p: a.p + +(p.p || 0), c: a.c + +(p.c || 0), f: a.f + +(p.f || 0) }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );
}
