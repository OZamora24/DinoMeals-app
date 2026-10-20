// Sends email through Resend's REST API (no extra package). Needs RESEND_API_KEY in Vercel.
//   REPORT_EMAIL_TO  who gets the weekly report (default: the kitchen's Gmail)
//   REPORT_FROM      "DinoMeals Reports <reports@dinomeals.app>" once the domain is verified in
//                    Resend; until then Resend only allows onboarding@resend.dev, which can only
//                    deliver to the email the Resend account was created with.
export const REPORT_TO_DEFAULT = 'dinomealsllc@gmail.com';

export function mailStatus(env = process.env) {
  return {
    configured: !!env.RESEND_API_KEY,
    to: env.REPORT_EMAIL_TO || REPORT_TO_DEFAULT,
    from: env.REPORT_FROM || 'DinoMeals Reports <onboarding@resend.dev>',
  };
}

export async function sendMail({ subject, html, text, attachments = [], to }, { env = process.env, fetchImpl = fetch } = {}) {
  const st = mailStatus(env);
  if (!st.configured) return { ok: false, error: 'email_not_configured' };
  try {
    const r = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: st.from,
        to: [to || st.to],
        subject,
        html,
        text,
        attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64') })),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Resend failed', r.status, j.name, j.message);
      return { ok: false, error: j.message || `status_${r.status}` };
    }
    return { ok: true, id: j.id };
  } catch (e) {
    console.error('Resend error', e?.message);
    return { ok: false, error: e?.message || 'network' };
  }
}
