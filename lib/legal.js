// Business details + wording used by the Privacy Policy, Terms, the SMS consent
// checkbox and the /sms page. Twilio/carriers compare these against the A2P 10DLC
// registration, so keep them IDENTICAL to what was entered in Twilio.
import { CONTACT_NAME, CONTACT_PHONE } from './orderForm.js';

export const LEGAL = {
  brand: 'DinoMeals',
  company: 'Dino Meals LLC', // legal business name — must match the Twilio brand registration (EIN)
  owner: 'Juan Carlos Ramirez',
  city: 'Riverside, CA',
  phone: CONTACT_PHONE,
  email: 'dinomealsllc@gmail.com',
  instagram: '@dino.meals',
  site: 'https://dinomeals.app',
  updated: { en: 'October 15, 2026', es: '15 de octubre de 2026' },
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

// Second, separate box: the weekly reminder before the order cutoff (recurring texts).
export const REMINDER_CONSENT = {
  en: {
    label: 'Text me a weekly reminder before the order cutoff',
    fine: 'DinoMeals will text you once a week (Thursdays) before orders close. Msg frequency: 1 per week. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Not required to order.',
  },
  es: {
    label: 'Mándenme un recordatorio semanal antes del cierre de órdenes',
    fine: 'DinoMeals te mandará un mensaje a la semana (los jueves) antes de que cierren las órdenes. Frecuencia: 1 por semana. Pueden aplicar tarifas de mensajes y datos. Responde STOP para no recibir más, HELP para ayuda. No es necesario para ordenar.',
  },
};

export const SMS_SAMPLES = {
  en: [
    '🦖 DinoMeals: Hi Maria! We got order #1042: 12 meals, total $168. Cook day: Sun, Oct 18. Pay by Zelle to (909) 436-6621 · Juan Ramirez. Reply STOP to opt out, HELP for help.',
    '🦖 DinoMeals: Payment received for order #1042 ($168). Thank you! Pickup Sun, Oct 18. Reply STOP to opt out, HELP for help.',
    '🦖 DinoMeals: Your order #1042 is ready for pickup! Pickup at 3485 Jefferson St, Riverside, CA 92504. Reply STOP to opt out, HELP for help.',
  ],
  reminder_en: '🦖 DinoMeals: Orders for this week close Fri 11:59 PM. Order at dinomeals.app/order. Reply STOP to opt out.',
  reminder_es: '🦖 DinoMeals: Las órdenes de esta semana cierran el vie 11:59 PM. Ordena en dinomeals.app/order. Responde STOP para no recibir más.',
  es: [
    '🦖 DinoMeals: ¡Hola Maria! Recibimos tu orden #1042: 12 comidas, total $168. Día de cocina: dom 18 de oct. Paga por Zelle a (909) 436-6621 · Juan Ramirez. Responde STOP para no recibir más, HELP para ayuda.',
    '🦖 DinoMeals: Pago recibido para la orden #1042 ($168). ¡Gracias! Recoge el dom 18 de oct. Responde STOP para no recibir más, HELP para ayuda.',
    '🦖 DinoMeals: ¡Tu orden #1042 está lista para recoger! Dirección: 3485 Jefferson St, Riverside, CA 92504. Responde STOP para no recibir más, HELP para ayuda.',
  ],
};
