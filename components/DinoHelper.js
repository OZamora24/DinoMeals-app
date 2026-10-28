import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Rex, the admin help pop-up: a floating dino that answers "how do I…?" questions
// about the app (from lib/dinoGuide.js). Read-only — Rex can't change anything.
const CHIPS = [
  'How do I print labels?',
  'Mark an order paid',
  'Enter an order from an IG DM',
  'Close ordering for a holiday',
  'Price a custom request',
  'Change a menu price',
];
const HELLO = "Hey Juan! I'm Rex 🦖 Ask me how anything in the app works — orders, labels, payments, settings. I can't change anything myself, and if I'm not sure I'll tell you to check with Orlando.";
const KEY = 'dino_helper_chat';

// Tiny safe formatter: escapes HTML, then **bold** and line breaks.
function fmt(text) {
  const esc = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>');
}

export default function DinoHelper() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { const s = JSON.parse(sessionStorage.getItem(KEY) || '[]'); if (Array.isArray(s)) setMsgs(s); } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch {}
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, busy, open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function ask(text) {
    const question = String(text || '').trim().slice(0, 600);
    if (!question || busy) return;
    const next = [...msgs, { role: 'user', content: question }];
    setMsgs(next);
    setQ('');
    setBusy(true);
    try {
      const r = await fetch('/api/helper', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: next }) });
      const j = await r.json().catch(() => ({}));
      const answer = r.status === 429 ? 'Whoa, lots of questions! Give me a minute and try again 🦖'
        : r.status === 401 ? 'You were logged out. Log in again and ask me.'
        : j.answer || "Sorry, I couldn't answer that right now. Try again, or contact Orlando.";
      setMode(j.mode || '');
      setMsgs((m) => [...m, { role: 'assistant', content: answer }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: "I couldn't connect. Check the internet and try again, or contact Orlando." }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  if (!mounted) return null;
  return createPortal(
    <>
      {!open && (
        <button type="button" className="dh-fab" onClick={() => setOpen(true)} aria-label="Ask Rex, the app helper">
          <img src="/chef-rex.webp" alt="" width="390" height="461" />
          <span className="dh-fab-tag">Need help?</span>
        </button>
      )}
      {open && (
        <div className="dh-panel" role="dialog" aria-modal="false" aria-label="Rex, the app helper">
          <header className="dh-head">
            <img src="/chef-rex.webp" alt="" width="390" height="461" />
            <div>
              <b>Rex</b>
              <small>App helper · answers how-to questions</small>
            </div>
            {msgs.length > 0 && <button type="button" className="dh-clear" onClick={() => setMsgs([])} title="Start over">New chat</button>}
            <button type="button" className="dh-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </header>
          <div className="dh-list" ref={listRef}>
            <div className="dh-msg bot" dangerouslySetInnerHTML={{ __html: fmt(HELLO) }} />
            {msgs.length === 0 && (
              <div className="dh-chips">
                {CHIPS.map((c) => <button key={c} type="button" onClick={() => ask(c)}>{c}</button>)}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`dh-msg ${m.role === 'user' ? 'me' : 'bot'}`} dangerouslySetInnerHTML={{ __html: fmt(m.content) }} />
            ))}
            {busy && <div className="dh-msg bot dh-typing" aria-label="Rex is typing"><i /><i /><i /></div>}
          </div>
          <form className="dh-form" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
            <input ref={inputRef} className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask Rex… (English o Español)" maxLength={600} autoComplete="off" name="rex-question" data-lpignore="true" data-1p-ignore />
            <button type="submit" className="btn btn-red" disabled={!q.trim() || busy}>Ask</button>
          </form>
          <p className="dh-foot">Rex only explains how the app works — he can't change orders or settings.{mode === 'guide' ? ' (Quick-answer mode)' : ''} Something wrong? Contact Orlando.</p>
        </div>
      )}
    </>,
    document.body
  );
}
