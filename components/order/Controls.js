import { Plus, Minus } from '../../components/Icons';

export function Stepper({ value, onDec, onInc, unit }) {
  return (
    <div className="stepper">
      <button aria-label="less" onClick={onDec} disabled={value <= 0}><Minus size={16} /></button>
      <span>{value}{unit ? <small> {unit}</small> : null}</span>
      <button aria-label="more" onClick={onInc}><Plus size={16} /></button>
    </div>
  );
}

export function Meter({ value, min, step = 1, label, unit }) {
  const slots = Math.max(min, Math.ceil(value / step) * step);
  const n = Math.round(slots / step);
  const filled = Math.floor(value / step);
  return (
    <div className={`meter ${value >= min ? 'ok' : ''}`}>
      <div className="meter-bars" style={{ gridTemplateColumns: `repeat(${Math.min(n, 12)}, 1fr)` }}>
        {Array.from({ length: Math.min(n, 12) }).map((_, i) => (
          <span key={i} className={i < filled ? 'f' : ''} />
        ))}
      </div>
      <div className="meter-label">{label}</div>
    </div>
  );
}
