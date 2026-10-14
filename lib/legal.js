// Business details + wording used by the Privacy Policy, Terms, the SMS consent
// checkbox and the /sms page. Twilio/carriers compare these against the A2P 10DLC
// registration, so keep them IDENTICAL to what was entered in Twilio.
import { CONTACT_NAME, CONTACT_PHONE } from './orderForm';

export const LEGAL = {
  brand: 'DinoMeals',
  owner: CONTACT_NAME, // sole proprietor — must match the Twilio Sole Proprietor brand name
  city: 'Rialto, CA',
  phone: CONTACT_PHONE,
  instagram: '@dino.meals',
  site: 'https://dinomeals.vercel.app',
  updated: { en: 'October 14, 2026', es: '14 de octubre de 2026' },
};

// The checkbox text. Starts unchecked; ordering never requires it.
export const SMS_CONSENT = {
  en: {
    label: 'Text me updates about this order from DinoMeals',
    fine: 'Order confirmation, payment received, and order ready / out for delivery — up to 3 texts per order. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Not required to order.',
  },
  es: {
    label: 'Mándenme mensajes de texto de DinoMeals sobre esta orden',
    fine: 'Confirmación de la orden, pago recibido y orden lista / en camino — hasta 3 mensajes por orden. Pueden aplicar tarifas de mensajes y datos. Responde STOP para no recibir más, HELP para ayuda. No es necesario para ordenar.',
  },
};

export const SMS_SAMPLES = {
  en: [
    'DinoMeals: Hi Maria! We got order #1042: 12 meals, total $168. Cook day: Sun, Oct 18. Pay by Zelle to (909) 436-6621. Reply STOP to opt out, HELP for help.',
    'DinoMeals: Payment received for order #1042 ($168). Thank you! Pickup Sun, Oct 18. Reply STOP to opt out, HELP for help.',
    'DinoMeals: Your order #1042 is ready for pickup! Reply STOP to opt out, HELP for help.',
  ],
  es: [
    'DinoMeals: ¡Hola Maria! Recibimos tu orden #1042: 12 comidas, total $168. Día de cocina: dom, 18 oct. Paga por Zelle a (909) 436-6621. Responde STOP para no recibir más, HELP para ayuda.',
    'DinoMeals: Pago recibido para la orden #1042 ($168). ¡Gracias! Recoge el dom, 18 oct. Responde STOP para no recibir más, HELP para ayuda.',
    'DinoMeals: ¡Tu orden #1042 está lista para recoger! Responde STOP para no recibir más, HELP para ayuda.',
  ],
};
