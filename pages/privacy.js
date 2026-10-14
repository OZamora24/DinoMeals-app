import LegalPage from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

const L = LEGAL;
const tel = <a href={`tel:${L.phone.replace(/\D/g, '')}`}>{L.phone}</a>;

const content = {
  en: {
    title: 'Privacy Policy',
    intro: `${L.brand} is a meal-prep business run by ${L.owner} in ${L.city}. This policy explains what we collect when you order at ${L.site.replace('https://', '')} and how we use it.`,
    sections: [
      { h: 'What we collect', p: [[
        'Your name, phone number and (optional) email.',
        'Your order: meals, notes, allergy/diet notes, pickup or delivery choice, and delivery address if you choose delivery.',
        'How you plan to pay (Zelle, cash or card) and whether the order is paid. We never see or store card numbers — card payments go through the payment link’s own provider.',
        'Whether you agreed to receive order text messages, and when.',
      ]] },
      { h: 'How we use it', p: [[
        'To cook, label and hand off or deliver your order.',
        'To contact you about your order (call, text or Instagram DM).',
        'To let you reload "your usual" order with your phone number.',
        'To keep simple sales records for the business.',
      ]] },
      { h: 'Text messages (SMS)', p: [
        `If you check the box "Text me updates about this order" at checkout, ${L.brand} will send you up to 3 text messages per order: an order confirmation, a payment-received notice, and an order-ready / out-for-delivery notice. We don't send marketing texts. Checking the box is optional and is not required to place an order.`,
        'Message frequency varies by order (up to 3 per order). Message and data rates may apply. Reply STOP at any time to opt out, or HELP for help. You can also contact us at the number below.',
        <b key="b">No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging opt-in data and consent are not shared with or sold to any third parties.</b>,
        'Information sharing to subcontractors in support services, such as customer service and the text-message provider that delivers our texts, is permitted. All other use case categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.',
      ] },
      { h: 'Who else sees your information', p: [
        'We do not sell, rent or trade your personal information. It is stored with the service providers that run this website and its database (Vercel and Supabase) and, if you opted in to texts, the provider that delivers them (Twilio) — only so they can provide those services to us.',
      ] },
      { h: 'How long we keep it', p: [
        'Order records are kept as business records. You can ask us to delete your information at any time, unless we need to keep it for an unpaid order or the law requires it.',
      ] },
      { h: 'Your choices', p: [
        'Reply STOP to any text to stop texts. To see, correct or delete your information, call or text us.',
      ] },
      { h: 'Contact', p: [<>{L.brand} · {L.owner} · {L.city} · {tel} · Instagram {L.instagram}</>] },
    ],
  },
  es: {
    title: 'Política de Privacidad',
    intro: `${L.brand} es un negocio de meal prep de ${L.owner} en ${L.city}. Esta política explica qué datos recopilamos cuando ordenas en ${L.site.replace('https://', '')} y cómo los usamos.`,
    sections: [
      { h: 'Qué recopilamos', p: [[
        'Tu nombre, número de teléfono y correo (opcional).',
        'Tu orden: comidas, notas, alergias/dieta, recoger o entrega, y la dirección si escoges entrega.',
        'Cómo vas a pagar (Zelle, efectivo o tarjeta) y si la orden está pagada. Nunca vemos ni guardamos números de tarjeta.',
        'Si aceptaste recibir mensajes de texto sobre tu orden, y cuándo.',
      ]] },
      { h: 'Cómo lo usamos', p: [[
        'Para cocinar, etiquetar y entregar tu orden.',
        'Para contactarte sobre tu orden (llamada, texto o DM de Instagram).',
        'Para que puedas cargar "tu orden de siempre" con tu número.',
        'Para llevar registros de ventas del negocio.',
      ]] },
      { h: 'Mensajes de texto (SMS)', p: [
        `Si marcas la casilla "Mándenme mensajes de texto sobre esta orden" al pagar, ${L.brand} te enviará hasta 3 mensajes por orden: confirmación, pago recibido y orden lista / en camino. No mandamos mensajes de publicidad. La casilla es opcional y no es necesaria para ordenar.`,
        'La frecuencia depende de tu orden (hasta 3 por orden). Pueden aplicar tarifas de mensajes y datos. Responde STOP para no recibir más o HELP para ayuda.',
        <b key="b">No compartiremos tu información móvil con terceros ni afiliados para fines de mercadeo o promoción. Los datos y el consentimiento para mensajes de texto no se comparten ni se venden a terceros.</b>,
        'Se permite compartir información con proveedores que nos dan servicio, como el proveedor que entrega nuestros mensajes de texto. Fuera de eso, esta información no se comparte con terceros.',
      ] },
      { h: 'Quién más ve tu información', p: [
        'No vendemos, rentamos ni intercambiamos tu información. Se guarda con los proveedores que operan este sitio y su base de datos (Vercel y Supabase) y, si aceptaste mensajes, el proveedor que los entrega (Twilio), solo para darnos ese servicio.',
      ] },
      { h: 'Cuánto tiempo la guardamos', p: [
        'Guardamos las órdenes como registros del negocio. Puedes pedirnos borrar tu información en cualquier momento, salvo que haya una orden sin pagar o la ley lo requiera.',
      ] },
      { h: 'Tus opciones', p: ['Responde STOP a cualquier mensaje para dejar de recibirlos. Para ver, corregir o borrar tu información, llámanos o mándanos texto.'] },
      { h: 'Contacto', p: [<>{L.brand} · {L.owner} · {L.city} · {tel} · Instagram {L.instagram}</>] },
    ],
  },
};

export default function Privacy() {
  return <LegalPage content={content} />;
}
