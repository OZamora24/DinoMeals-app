import { isValidSession } from '../../lib/adminSession';
import { rateLimit } from '../../lib/rateLimit';
import { systemPrompt, offlineAnswer, cleanMessages, NOT_SURE } from '../../lib/dinoHelper';

// Admin only: Rex, the help pop-up. Read-only — it only answers questions.
// Uses Claude when ANTHROPIC_API_KEY is set, otherwise searches the guide.
const MODEL = () => process.env.HELPER_MODEL || 'claude-haiku-4-5';

export default async function handler(req, res) {
  if (!isValidSession(req)) return res.status(401).json({ error: 'Not logged in' });
  if (req.method !== 'POST') return res.status(405).end();
  if (!rateLimit(req, 'helper', 30, 10 * 60 * 1000)) return res.status(429).json({ error: 'slow_down' });
  const messages = cleanMessages(req.body?.messages);
  if (!messages.length) return res.status(400).json({ error: 'empty' });
  const question = messages[messages.length - 1].content;

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: MODEL(),
          max_tokens: 600,
          system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
          messages,
        }),
        signal: AbortSignal.timeout(25000),
      });
      const j = await r.json();
      const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
      if (r.ok && text) return res.status(200).json({ answer: text, mode: 'ai' });
      console.error('helper ai error', r.status, j?.error?.type);
    } catch (e) {
      console.error('helper ai failed', e?.name);
    }
  }
  const found = offlineAnswer(question);
  return res.status(200).json({ answer: found || NOT_SURE, mode: 'guide', matched: !!found });
}
