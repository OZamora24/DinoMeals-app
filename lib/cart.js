// Turns stored order lines back into a cart the order builder / pricing
// understands (used for "order my usual" and admin "repeat for this week").
export function linesToCart(lines = []) {
  const cart = { meals: [], lbs: [] };
  for (const l of lines || []) {
    if (l.type === 'meal') cart.meals.push({ protein: l.protein, flavor: l.flavor, carb: l.carb, veg: l.veg, sets: l.sets });
    else if (l.type === 'lb') cart.lbs.push({ kind: l.kind, item: l.item, flavor: l.flavor, lbs: l.lbs });
  }
  return cart;
}

export function cartKey(cart) {
  const m = cart.meals.map((x) => [x.protein, x.flavor || '', x.carb, x.veg, x.sets].join(':')).sort();
  const l = cart.lbs.map((x) => [x.kind, x.item, x.flavor || '', x.lbs].join(':')).sort();
  return m.join('|') + '#' + l.join('|');
}
