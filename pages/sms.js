import { useState } from 'react';
import LegalPage from '../components/LegalPage';
import SmsConsent from '../components/SmsConsent';
import { LEGAL, SMS_SAMPLES } from '../lib/legal';
import { useLang } from '../lib/i18n';

// Public page that shows exactly how customers opt in to texts — the URL given to
// Twilio/carriers as proof of consent (the real box lives in the checkout sheet).
const L = LEGAL;
const content = {
  en: {
    title: 'Text Message Updates',
    intro: `How customers opt in to ${L.brand} order-update texts.`,
    sections: [
      { h: 'How opt-in works', p: [[
        `On ${L.site.replace('https://', '')}/order, customers build their order and tap Checkout.`,
        'In the checkout form, under name and phone number, there is a separate checkbox (shown above, exactly as it appears). It is unchecked by default and optional — orders go through with or without it.',
        'Only customers who check it get texts, and only about the order they just placed.',
      ]] },
      { h: 'The 3 messages', p: [SMS_SAMPLES.en] },
      { h: 'Opt out & help', p: ['Reply STOP to opt out, HELP for help. Message frequency: up to 3 per order. Message & data rates may apply.', <>See our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms</a>.</>] },
    ],
  },
  es: {
    title: 'Mensajes de Texto',
    intro: `Cómo los clientes aceptan recibir mensajes de ${L.brand} sobre su orden.`,
    sections: [
      { h: 'Cómo se acepta', p: [[
        `En ${L.site.replace('https://', '')}/order, el cliente arma su orden y toca Pagar.`,
        'En el formulario, debajo de nombre y teléfono, hay una casilla aparte (arriba, tal como aparece). Empieza sin marcar y es opcional.',
        'Solo quien la marca recibe mensajes, y solo sobre la orden que acaba de hacer.',
      ]] },
      { h: 'Los 3 mensajes', p: [SMS_SAMPLES.es] },
      { h: 'Cancelar y ayuda', p: ['Responde STOP para no recibir más, HELP para ayuda. Hasta 3 mensajes por orden. Pueden aplicar tarifas.', <>Ver <a href="/privacy">Privacidad</a> y <a href="/terms">Términos</a>.</>] },
    ],
  },
};

function Demo() {
  const { lang } = useLang();
  const [on, setOn] = useState(false);
  return (
    <div className="sms-demo">
      <div className="sms-demo-head">{lang === 'es' ? 'Así aparece al pagar:' : 'As it appears at checkout:'}</div>
      <SmsConsent lang={lang} checked={on} onChange={setOn} />
    </div>
  );
}

export default function SmsPage() {
  return (
    <LegalPage content={content}>
      <Demo />
    </LegalPage>
  );
}
