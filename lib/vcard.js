// The DinoMeals contact card (vCard 3.0). Customers save it so iPhone/Android treat
// the order texts from (909) 504-3053 as a known sender — links in the texts become tappable.
import { CONTACT_PHOTO_JPEG } from './contactPhoto.js';

export const TEXT_NUMBER = '(909) 504-3053'; // Twilio number the order texts come from
const TEXT_E164 = '+19095043053';
const OWNER_E164 = '+19094366621'; // Juan Carlos — call/text with questions (CONTACT_PHONE)

// vCard lines must be folded at 75 octets: continuation lines start with one space.
function fold(line) {
  if (line.length <= 75) return line;
  const out = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) out.push(' ' + line.slice(i, i + 74));
  return out.join('\r\n');
}

export function buildVCard({ photo = true } = {}) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:;DinoMeals;;;',
    'FN:DinoMeals',
    'ORG:Dino Meals LLC',
    'item1.TEL;type=CELL;type=pref:' + TEXT_E164,
    'item1.X-ABLabel:Order texts',
    'item2.TEL;type=CELL:' + OWNER_E164,
    'item2.X-ABLabel:Juan Carlos',
    'EMAIL;type=INTERNET:dinomealsllc@gmail.com',
    'URL:https://dinomeals.app',
    'NOTE:Meal prep - order at dinomeals.app. Order updates come from ' + TEXT_NUMBER + '.',
    ...(photo ? ['PHOTO;ENCODING=b;TYPE=JPEG:' + CONTACT_PHOTO_JPEG] : []),
    'END:VCARD',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
