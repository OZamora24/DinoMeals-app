// Admin: one "by the lb" line — item (protein / carb / veggie), flavor when it has one, and pounds.
// Used by the order editor (change or add lb items) and the custom label editor (lb labels).
import { PROTEINS, CARBS, VEGGIES, activeFlavors, byId, lbUnitPrice, money } from '../lib/menu';
import { Stepper } from './order/Controls';
import { X } from './Icons';

export const LB_GROUPS = [
  ['protein', 'Proteins', PROTEINS.filter((p) => p.lb != null)],
  ['carb', 'Carbs', CARBS.filter((c) => c.lb != null)],
  ['veg', 'Veggies', VEGGIES.filter((v) => v.lb != null)],
];

// Flavors an lb item can have (burgers use their own lb list). Empty = none.
export function lbFlavors(kind, item) {
  if (kind !== 'protein') return [];
  const p = byId(PROTEINS, item);
  return p ? activeFlavors(p.lbFlavors || p.flavors) : [];
}

// A new lb line for this item, with its first flavor picked.
export function lbLine(kind, item, lbs = 1) {
  const fl = lbFlavors(kind, item);
  return { kind, item, ...(fl.length ? { flavor: fl[0].id } : {}), lbs };
}
export const newLbLine = () => lbLine('protein', 'chicken', 1);

export default function LbLinePicker({ line, onChange, onRemove, step = 1, showPrice = true }) {
  const fl = lbFlavors(line.kind, line.item);
  const p = byId(PROTEINS, line.item);
  const hiddenFl = line.kind === 'protein' && p && line.flavor && !fl.some((f) => f.id === line.flavor)
    ? (p.lbFlavors || p.flavors || []).filter((f) => f.id === line.flavor)
    : [];
  const unit = lbUnitPrice(line);
  const lbs = Number(line.lbs) || 0;
  return (
    <div className="edit-line lb-pick">
      <div className="grid2">
        <select className="input" aria-label="Item by the lb" value={`${line.kind}:${line.item}`} onChange={(e) => { const [k, id] = e.target.value.split(':'); onChange({ ...lbLine(k, id, lbs || 1) }); }}>
          {LB_GROUPS.map(([k, title, list]) => (
            <optgroup key={k} label={title}>
              {list.map((x) => <option key={x.id} value={`${k}:${x.id}`}>{x.lbName || x.name}</option>)}
            </optgroup>
          ))}
        </select>
        {fl.length > 0 ? (
          <select className="input" aria-label="Flavor" value={line.flavor || fl[0].id} onChange={(e) => onChange({ ...line, flavor: e.target.value })}>
            {fl.concat(hiddenFl).map((f) => <option key={f.id} value={f.id}>{f.name}{f.extra ? ` (+$${f.extra}/lb)` : ''}</option>)}
          </select>
        ) : <span />}
      </div>
      <div className="edit-line-foot">
        <Stepper value={lbs} onDec={() => onChange({ ...line, lbs: Math.max(0, Math.round((lbs - step) * 2) / 2) })} onInc={() => onChange({ ...line, lbs: Math.round((lbs + step) * 2) / 2 })} unit="lb" />
        {showPrice ? <b>{unit == null ? '—' : money(unit * lbs)}</b> : <span />}
        <button type="button" className="btn btn-ghost btn-sm" aria-label="Remove" onClick={onRemove}><X size={14} /></button>
      </div>
    </div>
  );
}
