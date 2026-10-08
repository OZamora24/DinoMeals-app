// Weekly order-volume thresholds for the admin dashboard notice.
// Each order is ~1 KB, so payload isn't the issue - the admin page renders
// every order of the week as a card (slow to scroll on a phone), and the
// orders query silently stops at 1000 rows (see listOrders in lib/db.js).
export const ORDERS_WARN = 150; // heads-up: plan the change
export const ORDERS_ACT = 300; // time to add pagination / a compact list view
