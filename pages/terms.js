import LegalPage from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

const L = LEGAL;
const tel = <a href={`tel:${L.phone.replace(/\D/g, '')}`}>{L.phone}</a>;

const content = {
  en: {
    title: 'Terms & Conditions',
    intro: `These terms apply to orders placed with ${L.brand}, a meal-prep business operated by ${L.company} (owner: ${L.owner}) in ${L.city}, through ${L.site.replace('https://', '')}.`,
    sections: [
      { h: 'Orders', p: [[
        'Meals are cooked on cook day (Sunday). Orders placed after the weekly cutoff roll into the following week.',
        'Meal prep has an 8-meal minimum; by-the-lb orders have a 4 lb minimum. Custom requests are quoted by text before they are confirmed.',
        'Prices shown at checkout are the prices you pay. We may cancel an order that can’t be filled (for example, an item sold out) and will let you know.',
      ]] },
      { h: 'Payment', p: ['Payment (Zelle, cash or card) is due before cook day. We start cooking once payment comes in.'] },
      { h: 'Pickup & delivery', p: ['Pickup is on cook day. Delivery is Monday morning within our delivery area. Please keep meals refrigerated once you receive them.'] },
      { h: 'Allergies', p: ['Allergen labels are provided in good faith. Our kitchen handles dairy, shellfish, fish, soy, wheat, sesame and other allergens, so we can’t guarantee any meal is allergen-free. Tell us about allergies in your order.'] },
      { h: 'Text message program (SMS terms)', p: [
        `Program name: ${L.brand} Order Updates. If you check the optional box at checkout, ${L.brand} will text the phone number on your order with updates about that order: an order confirmation, a payment-received notice, and an order-ready / out-for-delivery notice. Apart from the optional weekly reminder below, no promotional messages are sent.`,
        [
          'Weekly reminder (separate optional box "Text me a weekly reminder before the order cutoff"): 1 text per week, on Thursdays, before orders close.',
          'Message frequency: up to 3 messages per order, plus 1 per week if you chose the weekly reminder.',
          'Message and data rates may apply.',
          'To stop: reply STOP to any message. You will get one confirmation and no more texts. To get help: reply HELP, or call/text ' + L.phone + '.',
          'Consent to receive texts is not a condition of purchase.',
          'Carriers are not liable for delayed or undelivered messages.',
          'Supported on major U.S. carriers.',
        ],
        <>How we handle your number is described in our <a href="/privacy">Privacy Policy</a>. No mobile information is shared with third parties or affiliates for marketing or promotional purposes.</>,
      ] },
      { h: 'Changes', p: ['We may update these terms; the date at the top shows the latest version.'] },
      { h: 'Contact', p: [<>{L.company} (dba {L.brand}) · {L.owner} · {L.city} · {tel} · <a href={`mailto:${L.email}`}>{L.email}</a> · Instagram {L.instagram}</>] },
    ],
  },
  es: {
    title: 'Términos y Condiciones',
    intro: `Estos términos aplican a las órdenes hechas con ${L.brand}, un negocio de meal prep operado por ${L.company} (dueño: ${L.owner}) en ${L.city}, en ${L.site.replace('https://', '')}.`,
    sections: [
      { h: 'Órdenes', p: [[
        'Cocinamos el día de cocina (domingo). Las órdenes después del corte semanal pasan a la siguiente semana.',
        'Meal prep: mínimo 8 comidas. Por libra: mínimo 4 libras. Los pedidos a tu gusto se cotizan por texto antes de confirmarse.',
        'Los precios al pagar son los que pagas. Podemos cancelar una orden que no se pueda surtir (por ejemplo, algo agotado) y te avisaremos.',
      ]] },
      { h: 'Pago', p: ['El pago (Zelle, efectivo o tarjeta) se hace antes del día de cocina. Empezamos a cocinar cuando llega el pago.'] },
      { h: 'Recoger y entrega', p: ['Se recoge el día de cocina. La entrega es el lunes en la mañana dentro del área de entrega. Mantén las comidas refrigeradas.'] },
      { h: 'Alergias', p: ['Las etiquetas de alérgenos son informativas. En la cocina se usan lácteos, mariscos, pescado, soya, trigo, ajonjolí y otros, así que no podemos garantizar que una comida esté libre de alérgenos. Avísanos de tus alergias en la orden.'] },
      { h: 'Programa de mensajes de texto (SMS)', p: [
        `Nombre del programa: ${L.brand} Order Updates. Si marcas la casilla opcional al pagar, ${L.brand} mandará mensajes al número de tu orden con avisos de esa orden: confirmación, pago recibido y orden lista / en camino. Aparte del recordatorio semanal opcional, no mandamos publicidad.`,
        [
          'Recordatorio semanal (casilla opcional aparte): 1 mensaje por semana, los jueves, antes del cierre de órdenes.',
          'Frecuencia: hasta 3 mensajes por orden, más 1 por semana si escogiste el recordatorio.',
          'Pueden aplicar tarifas de mensajes y datos.',
          'Para cancelar: responde STOP a cualquier mensaje. Recibirás una confirmación y no más mensajes. Para ayuda: responde HELP, o llama/manda texto al ' + L.phone + '.',
          'Aceptar mensajes no es condición de compra.',
          'Las compañías telefónicas no son responsables por mensajes retrasados o no entregados.',
        ],
        <>Cómo manejamos tu número está en nuestra <a href="/privacy">Política de Privacidad</a>. No compartimos información móvil con terceros ni afiliados para mercadeo o promoción.</>,
      ] },
      { h: 'Cambios', p: ['Podemos actualizar estos términos; la fecha de arriba muestra la versión más reciente.'] },
      { h: 'Contacto', p: [<>{L.company} (dba {L.brand}) · {L.owner} · {L.city} · {tel} · <a href={`mailto:${L.email}`}>{L.email}</a> · Instagram {L.instagram}</>] },
    ],
  },
};

export default function Terms() {
  return <LegalPage content={content} />;
}
