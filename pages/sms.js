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
    intro: `How customers opt in to ${L.brand} texts. ${L.brand} is operated by ${L.company}, ${L.city}.`,
    sections: [
      { h: 'How opt-in works', p: [[
        `On ${L.site.replace('https://', '')}/order, customers build their order and tap Checkout.`,
        'In the checkout form, under name and phone number, there are two separate checkboxes (shown above, exactly as they appear). Both are unchecked by default and optional — orders go through with or without them.',
        'Box 1 (order updates): only customers who check it get texts, and only about the order they just placed — up to 3 per order.',
        'Box 2 (weekly reminder): only customers who check it get one text per week, on Thursdays, before orders close.',
      ]] },
      { h: 'Order updates (box 1)', p: [SMS_SAMPLES.en] },
      { h: 'Weekly reminder (box 2)', p: [[SMS_SAMPLES.reminder_en]] },
      { h: 'Opt out & help', p: ['Reply STOP to opt out, HELP for help. Message frequency: up to 3 per order, plus 1 per week with the weekly reminder. Message & data rates may apply.', <>See our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms</a>.</>] },
    ],
  },
  es: {
    title: 'Mensajes de Texto',
    intro: `Cómo los clientes aceptan recibir mensajes de ${L.brand}. ${L.brand} es operado por ${L.company}, ${L.city}.`,
    sections: [
      { h: 'Cómo se acepta', p: [[
        `En ${L.site.replace('https://', '')}/order, el cliente arma su orden y toca Pagar.`,
        'En el formulario, debajo de nombre y teléfono, hay dos casillas aparte (arriba, tal como aparecen). Empiezan sin marcar y son opcionales.',
        'Casilla 1 (avisos de la orden): solo quien la marca recibe mensajes, y solo sobre la orden que acaba de hacer — hasta 3 por orden.',
        'Casilla 2 (recordatorio semanal): solo quien la marca recibe un mensaje por semana, los jueves, antes del cierre de órdenes.',
      ]] },
      { h: 'Avisos de la orden (casilla 1)', p: [SMS_SAMPLES.es] },
      { h: 'Recordatorio semanal (casilla 2)', p: [[SMS_SAMPLES.reminder_es]] },
      { h: 'Cancelar y ayuda', p: ['Responde STOP para no recibir más, HELP para ayuda. Hasta 3 mensajes por orden, más 1 por semana con el recordatorio. Pueden aplicar tarifas.', <>Ver <a href="/privacy">Privacidad</a> y <a href="/terms">Términos</a>.</>] },
    ],
  },
};

function Demo() {
  const { lang } = useLang();
  const [on, setOn] = useState(false);
  const [rem, setRem] = useState(false);
  return (
    <div className="sms-demo">
      <div className="sms-demo-head">{lang === 'es' ? 'Así aparece al pagar:' : 'As it appears at checkout:'}</div>
      <SmsConsent lang={lang} checked={on} onChange={setOn} />
      <SmsConsent kind="reminder" lang={lang} checked={rem} onChange={setRem} />
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
