import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LABELS_PER_SHEET, clampSpot, nextStart, sheetsUsed } from '../lib/labelSpots';

// 🏷️ Labels: pick where on the sheet to start, then download the Word file.
// The app remembers where the last print ended (on this device), so a partly used
// sheet is finished by the next order instead of being thrown away.
const KEY = 'dino_label_next';
const readNext = () => { try { return clampSpot(localStorage.getItem(KEY) || 1); } catch { return 1; } };
const saveNext = (n) => { try { localStorage.setItem(KEY, String(n)); } catch {} };

export default function LabelsButton({ href, count, label = '🏷️ Labels', title, className = 'btn btn-ghost btn-sm' }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(1);
  useEffect(() => { if (open) setStart(readNext()); }, [open]);
  if (!count) return null;

  const sheets = sheetsUsed(start, count);
  const next = nextStart(start, count);
  const lastSheetFree = next === 1 ? 0 : LABELS_PER_SHEET - next + 1;
  const firstSheetPrinted = Math.min(count, LABELS_PER_SHEET - start + 1);

  const download = () => {
    saveNext(next);
    window.location.href = `${href}${href.includes('?') ? '&' : '?'}start=${start}`;
    setOpen(false);
  };

  const spots = Array.from({ length: LABELS_PER_SHEET }, (_, i) => {
    const n = i + 1;
    const state = n < start ? 'used' : n < start + firstSheetPrinted ? 'print' : 'free';
    return (
      <button key={n} type="button" className={`ls-spot ${state}`} onClick={() => setStart(n)} aria-label={`Start at spot ${n}`}>
        <b>{n}</b>
        <small>{state === 'used' ? 'used' : state === 'print' ? (n === start ? 'start' : '') : 'empty'}</small>
      </button>
    );
  });

  return (
    <>
      <button type="button" className={className} title={title || 'Print meal labels (Word, 3x2 sheets)'} onClick={() => setOpen(true)}>{label}</button>
      {open && createPortal(
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="sheet ls-sheet" role="dialog" aria-modal="true">
            <div className="sheet-head">
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>← Back</button>
              <h2>Print labels</h2>
              <span />
            </div>
            <div className="sheet-body ls-body">
              <p className="ls-q">Tap the <b>first empty sticker</b> on the sheet in the printer.</p>
              <div className="ls-grid">{spots}</div>
              <div className="ls-sum">
                <div><b>{count}</b> label{count === 1 ? '' : 's'} · <b>{sheets}</b> sheet{sheets === 1 ? '' : 's'}{start > 1 ? ` (finishes the open sheet first)` : ''}</div>
                {lastSheetFree > 0
                  ? <div className="ls-left">{lastSheetFree} sticker{lastSheetFree === 1 ? '' : 's'} left on the last sheet. Keep it: the next print will start at spot <b>{next}</b>.</div>
                  : <div className="ls-left ok">Uses every sticker. The next print starts on a new sheet.</div>}
              </div>
              <div className="ls-actions">
                <button className="btn btn-ghost" onClick={() => setStart(1)} disabled={start === 1}>New sheet</button>
                <button className="btn btn-red" onClick={download}>Download labels</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
