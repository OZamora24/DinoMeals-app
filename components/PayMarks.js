// "How you can pay" row (home page step 02 + footer). Apple Pay / Google Pay marks show only while
// online card payments (Stripe) are on. Marks are the brands' artwork, kept unaltered.
const CARDS = [['visa', 'Visa'], ['mastercard', 'Mastercard'], ['discover', 'Discover'], ['amex', 'American Express']];

export default function PayMarks({ settings = {}, t, small = false, label = false }) {
  const wallets = !!settings.card_online;
  return (
    <div className={`pay-marks ${small ? 'sm' : ''}`}>
      {label && <span className="pm-label">{t('pm_accept')}</span>}
      {wallets && (
        <>
          <img className="pm-ap" src="/pay/apple-pay.png" alt="Apple Pay" width="62" height="40" />
          <span className="pm-gp"><img src="/pay/google-pay.png" alt="Google Pay" width="56" height="24" /></span>
        </>
      )}
      {CARDS.map(([f, name]) => <img key={f} className="pm-cd" src={`/pay/${f}.png`} alt={name} width="46" height="30" />)}
      <img className="pm-ic" src="/pay/zelle.png" alt="Zelle" width="59" height="30" />
      <img className="pm-ic" src="/pay/venmo.png" alt="Venmo" width="30" height="30" />
      <span className="pm-cash">
        <svg viewBox="0 0 48 30" width="46" height="30" role="img" aria-label={t('pm_cash')}>
          <rect x="1.5" y="1.5" width="45" height="27" rx="4" fill="#2f9e5a" stroke="#1d6b3b" strokeWidth="2" />
          <rect x="6" y="6" width="36" height="18" rx="2" fill="none" stroke="#bfeacd" strokeWidth="1.5" />
          <circle cx="24" cy="15" r="6.5" fill="#bfeacd" />
          <text x="24" y="19.2" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1d6b3b" fontFamily="Arial, sans-serif">$</text>
        </svg>
      </span>
      {wallets && (
        <span className="pm-stripe">
          <img src="/pay/powered-by-stripe-white.svg" alt={t('pm_stripe')} width="119" height="27" />
        </span>
      )}
    </div>
  );
}
