// Pay links from shop settings. Venmo and Card are separate checkout options:
//   Venmo = `venmo_link`, or (older shops) a venmo.com link that was saved in the card / Cash App fields.
//   Card  = the remaining links (Square, PayPal, Cash App ...), never a Venmo one.
const firstUrl = (h) => String(h || '').trim().split(/\s+/)[0];
const isUrl = (h) => /^https?:\/\//.test(h);
const isVenmo = (h) => /venmo\./i.test(h);

export const labelForLink = (href) => (isVenmo(href) ? 'Venmo' : /cash\.app/i.test(href) ? 'Cash App' : /paypal\./i.test(href) ? 'PayPal' : '');

export function venmoLink(s = {}) {
  const own = firstUrl(s.venmo_link);
  if (isUrl(own)) return own;
  return [s.card_link, s.cashapp_link].map(firstUrl).find((h) => isUrl(h) && isVenmo(h)) || '';
}

export function cardLinks(s = {}) {
  return [s.card_link, s.cashapp_link]
    .map(firstUrl)
    .filter((h) => isUrl(h) && !isVenmo(h))
    .map((href) => ({ href, label: labelForLink(href) }));
}
