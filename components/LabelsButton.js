import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LABELS_PER_SHEET, clampSpot, nextStart, sheetsUsed, cleanLabelLines, customMacros } from '../lib/labelSpots';
import { PROTEINS, CARBS, VEGGIES, NONE, PORTIONS } from '../lib/menu';

// 🏷️ Labels: pick where on the sheet to start, then download the Word file.
// The app remembers where the last print ended (on this device), so a partly used
// sheet is finished by the next order instead of being thrown away.
// Custom-quote orders (typed as a note) also get a small editor to enter the meals
// with any oz/gram amounts; those lines are saved on the order (label_lines).
const KEY = 'dino_label_next';
const readNext = () => { try { return clampSpot(localStorage.getItem(KEY) || 1); } catch { return 1; } };
const saveNext = (n) => { try { localStorage.setItem(KEY, String(n)); } catch {} };

const newLine = () => ({
  protein: 'chicken', flavor: 'plain', carb: 'whiterice', veg: 'broccoli', count: 1,
  amt: { protein: [PORTIONS.protein, 'oz'], carb: [PORTIONS.carb, 'oz'], veg: [PORTIONS.veg, 'oz'] },
});
// Editor keeps amounts for every part (even when "None" is picked) so switching back keeps the number.
const toEditor = (l) => ({ ...newLine(), ...l, amt: { ...newLine().amt, ...(l.amt || {}) } });
const r0 = (n) => Math.round(n);

function Amount({ value, onChange }) {
  const [v, u] = value;
  return (
    <span className="cl-amt">
      <input className="input" inputMode="decimal" value={v} onChange={(e) => onChange([e.target.value, u])} aria-label="Amount" />
      <button type="button" className="cl-unit" onClick={() => onChange([v, u === 'oz' ? 'g' : 'oz'])} title="Switch oz / grams">{u}</button>
    </span>
  );
}

function LineEditor({ line, macros, onChange, onRemove }) {
  const p = PROTEINS.find((x) => x.id === line.protein);
  const set = (k, v) => onChange({ ...line, [k]: v });
  const setAmt = (kind, v) => onChange({ ...line, amt: { ...line.amt, [kind]: v } });
  const m = customMacros(cleanLabelLines([line])[0] || line, macros);
  return (
    <div className="cl-line">
      <div className="cl-row">
        <label>Protein</label>
        <select className="input" value={line.protein} onChange={(e) => onChange({ ...line, protein: e.target.value, flavor: PROTEINS.find((x) => x.id === e.target.value)?.flavors?.[0]?.id })}>
          {PROTEINS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <Amount value={line.amt.protein} onChange={(v) => setAmt('protein', v)} />
      </div>
      {p?.flavors && (
        <div className="cl-row">
          <label>Flavor</label>
          <select className="input" value={line.flavor} onChange={(e) => set('flavor', e.target.value)}>
            {p.flavors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <span className="cl-amt" />
        </div>
      )}
      <div className="cl-row">
        <label>Carb</label>
        <select className="input" value={line.carb} onChange={(e) => set('carb', e.target.value)}>
          {CARBS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          <option value={NONE}>None</option>
        </select>
        {line.carb !== NONE ? <Amount value={line.amt.carb} onChange={(v) => setAmt('carb', v)} /> : <span className="cl-amt" />}
      </div>
      <div className="cl-row">
        <label>Veggie</label>
        <select className="input" value={line.veg} onChange={(e) => set('veg', e.target.value)}>
          {VEGGIES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          <option value={NONE}>None</option>
        </select>
        {line.veg !== NONE ? <Amount value={line.amt.veg} onChange={(v) => setAmt('veg', v)} /> : <span className="cl-amt" />}
      </div>
      <div className="cl-foot">
        <span className="cl-count">
          <button type="button" onClick={() => set('count', Math.max(1, (Number(line.count) || 1) - 1))} aria-label="Fewer meals">−</button>
          <b>{line.count}</b> meal{Number(line.count) === 1 ? '' : 's'}
          <button type="button" onClick={() => set('count', Math.min(200, (Number(line.count) || 1) + 1))} aria-label="More meals">+</button>
        </span>
        <span className="cl-mac">{m ? `${r0(m.cal)} cal · ${r0(m.p)}P · ${r0(m.c)}C · ${r0(m.f)}F` : 'Macros missing in Menu settings'}</span>
        <button type="button" className="cl-x" onClick={onRemove} aria-label="Remove this meal">✕</button>
      </div>
    </div>
  );
}

export default function LabelsButton({ href, count, label = '🏷️ Labels', title, className = 'btn btn-ghost btn-sm', custom, macros, onSaveLines }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(1);
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const savedLines = (custom && custom.label_lines) || [];
  useEffect(() => {
    if (!open) return;
    setStart(readNext());
    if (custom) setLines(savedLines.length ? savedLines.map(toEditor) : [newLine()]);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!count && !custom) return null;

  const customCount = custom ? lines.reduce((n, l) => n + (Number(l.count) || 0), 0) : 0;
  const savedCount = custom ? savedLines.reduce((n, l) => n + (Number(l.count) || 0), 0) : 0;
  const total = custom ? count - savedCount + customCount : count;
  const sheets = sheetsUsed(start, total);
  const next = nextStart(start, total);
  const lastSheetFree = next === 1 ? 0 : LABELS_PER_SHEET - next + 1;
  const firstSheetPrinted = Math.min(total, LABELS_PER_SHEET - start + 1);

  const download = async () => {
    if (!total) return;
    setBusy(true);
    try {
      if (custom && onSaveLines) await onSaveLines(cleanLabelLines(lines));
      saveNext(next);
      window.location.href = `${href}${href.includes('?') ? '&' : '?'}start=${start}&t=${Date.now()}`;
      setOpen(false);
    } finally { setBusy(false); }
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
              {custom && (
                <section className="cl-box">
                  <h3 className="cl-h">1 · Meals on this order</h3>
                  {custom.custom_request && <p className="cl-note">✎ {custom.custom_request}</p>}
                  {lines.map((l, i) => (
                    <LineEditor key={i} line={l} macros={macros || {}}
                      onChange={(nl) => setLines((ls) => ls.map((x, j) => (j === i ? nl : x)))}
                      onRemove={() => setLines((ls) => ls.filter((_, j) => j !== i))} />
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm cl-add" onClick={() => setLines((ls) => [...ls, newLine()])}>+ Add another meal</button>
                  <h3 className="cl-h">2 · Where to start</h3>
                </section>
              )}
              <p className="ls-q">Tap the <b>first empty sticker</b> on the sheet in the printer.</p>
              <div className="ls-grid">{spots}</div>
              <div className="ls-sum">
                <div><b>{total}</b> label{total === 1 ? '' : 's'} · <b>{sheets}</b> sheet{sheets === 1 ? '' : 's'}{start > 1 ? ` (finishes the open sheet first)` : ''}</div>
                {!total ? <div className="ls-left">Add at least one meal.</div>
                  : lastSheetFree > 0
                    ? <div className="ls-left">{lastSheetFree} sticker{lastSheetFree === 1 ? '' : 's'} left on the last sheet. Keep it: the next print will start at spot <b>{next}</b>.</div>
                    : <div className="ls-left ok">Uses every sticker. The next print starts on a new sheet.</div>}
              </div>
              <div className="ls-actions">
                <button className="btn btn-ghost" onClick={() => setStart(1)} disabled={start === 1}>New sheet</button>
                <button className="btn btn-red" onClick={download} disabled={!total || busy}>{busy ? 'Saving…' : custom ? 'Save & download' : 'Download labels'}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
