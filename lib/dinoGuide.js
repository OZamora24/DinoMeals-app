// Rex's knowledge base: how DinoMeals works, written for Juan Carlos.
// Rex (the admin help pop-up) answers ONLY from this text.
// KEEP IT CURRENT: every time the app changes, update the matching section here
// (and GUIDE_UPDATED) in the same commit, so Rex knows about it.
export const GUIDE_UPDATED = '2026-10-28';
export const DINO_GUIDE = `# DinoMeals App Guide (for Juan Carlos)

This guide covers how to use the DinoMeals app: the customer website and the Kitchen (admin) page. All times are Pacific.

---

## 1. What DinoMeals sells

### Meal prep (per meal)
Each meal has one protein, one carb and one veggie. Standard portions are **4 oz protein, 4 oz carb, 3 oz veggie**. The protein sets the price, and some carbs and veggies add to it.

**Proteins (price per meal)**
- Smoked Tri-tip Steak: $15 (SMOKED)
- Southwest Smoked Chicken: $12 (SMOKED)
- Garlic Butter Shrimp: $14
- Smoked Burgers: $15 (SMOKED)
- Smashed Burgers: $14
- Ground Beef: $14. Customer must pick a flavor: Seasoned, Taco, or Korean BBQ (+$1)
- Ground Turkey: $12
- Grilled Chicken Breast: $12. Customer must pick a flavor: Classic, Chipotle, Montreal, Teriyaki or Pollo Asado (all $0 extra)
- Lemon Pepper Tilapia Loin: $12

**Carbs (extra per meal)**: Roasted Sweet Potatoes +$1. No extra charge for Roasted Red Potatoes, Mashed Red Potatoes, White Rice, Brown Rice or Cilantro Lime Rice.

**Veggies (extra per meal)**: Fajitas +$1, Green Beans +$1. No extra charge for Broccoli, Brussels Sprouts or Asparagus.

**Skipping a side**: a meal can drop its carb OR its veggie (the "N/A" button), and the price stays the same. It cannot drop both. A customer who wants protein only gets a pop-up called "Protein only?" that sends them to a Custom order.

**Bigger portions (flat upcharge per meal)**
- Protein: 4 oz (standard), 6 oz +$2, 8 oz +$4
- Carb: 4 oz (standard), 6 oz +$1, 8 oz +$2.50
- Veggie: 3 oz (standard), 5 oz +$1, 6 oz +$1.50

Example: Tri-tip + Sweet Potatoes + Green Beans = $17 per meal.

### Meal minimum and meal plans
- **8 meals minimum** for meal prep. The cap is 200 meals per order.
- In the "Meal plan" dropdown, customers choose:
  - Any custom amount · 8 meals min (this is the default; any mix, any count of 8 or more)
  - 8 meals · 2 sets of 4
  - 10 meals · 3 sets of 3 + 1 your pick
  - 12 meals · 4 sets of 3
  - 14 meals · 4 sets of 3 + 2 your pick
  - 16 meals · 5 sets of 3 + 1 your pick
- "How many plans?" goes from 1 to 5. For example, 2 × the 8-meal plan makes 16 meals.
- A plan has no discount. Its only job is to help the customer fill the box. The price is always the sum of the meals.

### By the lb (bulk, customer portions it themselves)
**4 lb minimum** in total, mix and match. Customers add 1 lb at a time.
- **Proteins per lb**: Tri-tip $30, Southwest Smoked Chicken $16, Garlic Butter Shrimp $25, Burgers $21 (flavors: Classic, Smashed, or Smoked +$1/lb), Ground Beef $20 (Seasoned / Taco / Korean BBQ +$1/lb), Ground Turkey $16, Grilled Chicken Breast $16 (pick a flavor), Tilapia $18. Smashed Burgers are not sold by the lb.
- **Carbs per lb**: Sweet Potatoes $13, Red Potatoes $11, Mashed $12, White Rice $10, Brown Rice $10, Cilantro Lime Rice $11.
- **Veggies per lb**: Green Beans $13, Broccoli $10, Brussels Sprouts $11, Asparagus $12. Fajitas are not sold by the lb.

One order can have both meals and lbs. Each part must meet its own minimum.

### Extras (add-on portions)
The "Add extras" panel appears once the box has meals or lbs. Each extra is one container (protein 4 oz, carb 4 oz, veggie 3 oz), with a limit of 30 of each item.
- Proteins: Tri-tip $7.50, SW Chicken $4, Shrimp $6.50, Smoked Burgers $5.50, Ground Beef $5, Turkey $4, Grilled Chicken $4, Tilapia $4.50
- Carbs: Sweet Potatoes $3.50, Red Potatoes $3, Mashed $3, White Rice $2.50, Brown Rice $2.50, Cilantro Lime Rice $3
- Veggies: Fajitas $2, Green Beans $2.50, Broccoli $2, Brussels $2, Asparagus $2.50

### Custom orders / quotes
In the **Custom** tab the customer types a request (other portions, a special diet, a big family batch, protein only, and so on). If the order has only a custom request and no priced items, it arrives as a **Quote** with no price. You set the price in the admin (see "Quotes" below). A customer can also add a custom note to a normal priced order.

### Allergens and diet
Each item can carry allergen labels (Dairy, Shellfish, Fish, Soy, Wheat/Gluten, Sesame, Egg, Tree nuts, Peanuts), and customers see them. The starting labels are: Shrimp = shellfish + dairy, Tilapia = fish, Mashed potatoes = dairy, Teriyaki chicken and Korean BBQ beef = soy, wheat, sesame. Customers always see this note: "All meals are made in the same kitchen, so we can't guarantee any meal is free of an allergen."

---

## 2. Ordering rules

- **Cook day is Sunday.** Every order belongs to one Sunday, called its "cook week".
- **Weekly cutoff**: the default is **Friday 8:00 PM**. Orders placed after the cutoff go to the following Sunday automatically. You can change the cutoff day and time in Menu & settings. Choosing 12:00 AM means the very start of that day (for example, Friday 12:00 AM is the same as Thursday 11:59 PM).
- **Pickup** is Sunday, using the pickup window you set (default text "Sunday afternoon"). The pickup address is shown to pickup customers.
- **Delivery** follows the delivery window you set (default "Monday morning"). The site says delivery covers a 12-mile radius or goes by Uber. You set the delivery fee ($0 by default) and a fee note such as "Fee depends on Uber". If you enter delivery ZIP codes, website customers outside those ZIPs see "That ZIP is outside our delivery area". If the list is blank, any ZIP is accepted.
- **Payment methods**: Zelle, Cash, or Card / Venmo. **Card fee**: $2 by default, added to the total when the customer picks Card. Customers are told: "Payment is due by Friday evening." The home page says "We cook what's paid for."
- **Flavors are required** for Grilled Chicken, Ground Beef and Burgers by the lb. The customer can't check out until a flavor is picked.
- **Sold out**: an item marked sold out shows "Sold out" and can't be picked anywhere (meals, by the lb or extras). If something sells out while a customer is ordering, they see "Something in your box just sold out — please update it."
- **Weekly capacity**: the default is a maximum of 40 different customers per cook week, and 0 means no limit. Once the week is full, new customers see "This week is full". A customer who already ordered that week can still place another order. You can always enter orders yourself.
- **Ordering closed**: when "Taking orders" is off, the site shows "Ordering is closed right now" and the order button says "Ordering closed".
- **Prices are always recalculated by the app.** Customers can't change them. If the price changes while a customer has the page open, they see "Prices just updated — please review your total."

---

## 3. The customer side, step by step

### Top bar (every page)
- **EN / ES** switches the whole site between English and Spanish. The phone remembers the choice.
- **🧾 My orders** (receipt icon) appears after a customer has ordered on that phone. It lists the last 5 orders placed or opened on that phone, each with its live status (Waiting on payment, Paid, Cooking, Ready, Picked up, Delivered, Cancelled, Price coming). A red dot means an order is still coming up. Tapping an order opens its private order page. There is no login; the list lives on that phone only.
- **🔔 Notifications bell**: the customer taps it to get DinoMeals notifications (promos and reminders) on their phone. On iPhone it only shows after DinoMeals has been added to the Home Screen.
- **📲 Get the app**: opens the "Dino guide", an animated walkthrough of adding DinoMeals to the Home Screen with steps for iPhone (Safari) or Android (Chrome). On Android an "Install now" button may appear. The button is hidden once the app is opened from the Home Screen.

### Home page
- The buttons are **Build my meals** and **Shop by the lb**.
- A status line shows "Now taking orders for [Sunday date]", "This week is full" or "Ordering is closed right now".
- Your **banner message** (if set) appears at the top.
- Below that: "How it works", the menu (Meal prep / By the lb switch, sold-out items marked), a "Same order every week?" link to "Order your usual", and the footer with pickup/delivery info and @dino.meals.

### Order page
- There are tabs for **Meal prep**, **By the lb** and **Custom**, plus a **Reset** button that empties the box after a confirmation. Contact info is kept.
- **Order your usual**: the customer types the phone number they ordered with and taps **Find**. Up to 3 different past orders appear, and **Load this** fills the box at today's prices.
- **Meal builder**: choose the Meal plan, then 1 Protein (plus Flavor and portion size), 2 Carb, 3 Veggie, then tap **Add N meals · $X**. On a plan, the box fills set by set, and the last leftover meals are "your pick" (any combo). On "Any custom amount" the customer sets "How many" (1–50) for each combo.
- The builder shows the price per meal, macros (if you've entered them) and "Contains: …" allergens.
- **Your box** lists each combo with an **Edit** link and +/− buttons. A meter shows progress ("Add N more meals to hit the 8-meal minimum", "Plan complete — you're good to go"). Total calories appear when macros exist.
- The **sticky bar** at the bottom shows the meal/lb count, the subtotal and the **Checkout** button.

### Checkout
1. **Your info**: Name, Phone (10 digits), Email (optional). There are two optional text boxes, both unchecked by default: "Text me updates about this order from DinoMeals" and "Text me a weekly reminder before the order cutoff".
2. **How you'll get it**: Pickup or Delivery. Delivery asks for the street address, ZIP, and gate code / drop-off notes.
3. **Payment**: Zelle, Cash, or Card / Venmo (shows "+$[card fee] fee", $2 by default).
4. **Allergies & diet**: tap chips for No dairy, Gluten-free, Shellfish allergy, Fish allergy, No soy, Low sodium or Not spicy, plus a free-text box.
5. **Review**: every line, the subtotal, delivery fee, card fee and total.
6. **Place order · $total**. Your name and phone are shown for questions.

### Confirmation screen
- The screen says "Order locked in!" with the order #, the cook day and the total.
- **Next step: pay to confirm**: Zelle shows "Send Zelle to [your Zelle info]" with Memo #order (or "We'll text you the Zelle info."); Card shows buttons like "Pay with Venmo · $X" / "Pay with Cash App" (or "We'll text you a card payment link"); Cash shows your cash instructions.
- An itemized **receipt** appears, with **📸 Save receipt** (a picture) and **🔗 Share order link** buttons.
- **📇 Add DinoMeals to contacts** downloads a contact card. This lets iPhone links in the order texts work, because the texts come from (909) 504-3053.
- Chef Rex pops in: "RAWR! SEE YOU SOON!"
- **Start another order** begins a new order.
- For a quote, the screen says: "We got your custom request — we'll text you a price soon."

### Private order page / tracker
Each order has its own private link (dinomeals.app/o/…). The link appears in the texts, on the confirmation screen and in My orders. The page shows:
- A tracker: **Received → Paid → Cooking → Ready**, with a message such as "Pay to lock in your spot, then we start cooking.", "Payment received. Thank you! We'll cook on cook day.", "We're cooking your order! 🔥" (once paid and it's cook day, or you set Cooking), "Your order is ready for pickup! 📦" / "…out for delivery! 🚗", "Picked up / Delivered. Enjoy your meals!" or "This order was cancelled."
- Payment instructions if the order is unpaid.
- The receipt with a "Paid ✓" or "Not paid yet" badge, Save receipt, Share order link, **🔁 Order this again** (loads it into the order page) and Add to contacts.

### Texts customers get
Texts only go out when texting is switched ON (see the Customer texts card in Menu & settings) AND the customer ticked the box. Each text goes out at most once per order:
1. **Order received**: sent when they place the order. It includes the items, total, cook day, how to pay and the order link. For a quote it says you'll text a price soon.
2. **Payment received**: sent when you mark the order **Paid**.
3. **Ready**: sent when you tap **ready**. Pickup texts include the pickup address (if saved); delivery texts say "out for delivery".
4. **Weekly reminder** (separate box): every **Thursday at 4 PM**, but only while ordering is open: "Orders for this week close [cutoff]…"

Customers can reply STOP to opt out. Orders you enter yourself (DM order) never get texts.

### Promo pop-ups / notifications
These are the messages you write in the **Messages** tab. They go to customers who turned on the 🔔 bell. When a customer taps the notification, the app opens with a dino-logo animation and shows the message in a pop-up with a "Got it" button, in their language.

---

## 4. The admin (Kitchen) page, tab by tab

### Logging in and staying logged in
- Go to the Kitchen page, enter the password and tap **Log in**.
- **Auto logout**: after 30 minutes with no taps or scrolling, a warning says "Still there? Logging out in 60s". Tap **Stay logged in** to keep going. If you don't, it logs you out ("You were logged out after 30 minutes of inactivity."). New-order notifications on your phone keep working after a logout.
- The order list refreshes by itself every 20 seconds. When a new order arrives, a "New order in!" message (and a chime, if sound is on) appears.

### Top bar
- **‹ Cook day [date] ›**: the arrows move one week back or forward. If you're viewing a different week, a strip says "Viewing a past/future week · Jump to current". All tabs show the week you're viewing.
- **🔔 Alerts**: new-order alerts for this device.
  - **Turn on alerts** registers the device. **Send test** sends a test alert. **Turn off** stops them. "Play a sound when an order comes in" turns the chime on or off.
  - On iPhone you must first add the Kitchen page to the Home Screen (Share → Add to Home Screen), open **Kitchen** from there, log in, and turn alerts on there.
  - The alert reads like "New order #1043 · Maria · 12 meals · $168 · Pickup". Alerts are only for website orders, not orders you enter yourself.
- **+ DM order**: enter an order for someone who messaged, texted or called (see below).

### Banners under the top bar
- **Capacity**: "12 of 40 customers this week · 28 spots left", or "FULL, the site is closed to new customers". Cancelled orders free up a spot.
- **Busy notice**: at 150 orders in a week you get a heads-up. At 300, a notice says to tell your developer the list needs a compact view.

### Orders tab
**Top numbers**: Orders, Meals (plus "lb bulk"), Sales and Still owed. Cancelled orders are not counted.

**Filters and tools**
- Computer: chips for **All, Unpaid, Pickup, Delivery, Custom quotes**, a search box ("Search name / phone / #"), **Export Excel** and **🏷️ All labels**.
- Phone: the search box, a download icon (Export Excel), a 🏷️ icon (All labels), and tabs **All / Unpaid / Pickup / Delivery** with counts. A **Quotes** tab appears when there are quotes.
- **Export Excel** downloads the week you're viewing: an "Orders" sheet (one row per order with every detail) and a "Summary" sheet of week totals. Cancelled orders are not counted.
- **🏷️ All labels** prints the labels for every order of the cook day (not cancelled), one after another.

**Completed**: orders marked **done** move into a **Completed** drop-down at the bottom. Tap it to open. Searching opens it automatically.

**Each order card shows**
- The # number, a red **NEW** tag (not confirmed yet), where it came from (Website, IG DM, Text, Call or Repeat) and **Texts ✓** if the customer opted in to texts.
- The name, the phone number (tap to call) and a **Text** link that opens your messages with "Hey [name]! DinoMeals here about order #…".
- The total (or "Quote") and the payment method.
- **Paid / Unpaid button**: tap it to switch. Marking Paid sends the "payment received" text if texts are on.
- ⚠ diet and allergy flags, the items, ✎ the custom request and the kitchen notes.
- 🚚 Delivery with the address (tap for Google Maps), or 📍 Pickup.
- **Status pills**: **confirmed, cooking, ready, done**. Tap one to set it. "ready" sends the ready text. "done" moves the card to Completed. New website orders start as "new".
- **Edit**: opens "Edit order #…" (see below).
- **🏷️ Labels**: prints labels for this order.
- **Next week**: makes a COPY of this order in the following week (unpaid, today's prices). The original stays where it is.
- **Cancel**: keeps the order but marks it cancelled. It no longer counts in totals, the cook sheet, payments, delivery or labels, and the customer's page shows "cancelled".
- **Delete**: removes the order permanently after asking "Delete this order for good?". This can't be undone.

**Edit order dialog**
- **Customer**: Name, Phone, Email.
- **Items**: change the protein, flavor, carb (or "No carb") and veggie (or "No veggie") for each meal line, change counts with −/+, or remove a line. Lb lines and extras have −/+ too. **+ Add a meal** adds a line. The **Custom request** text is also here. Changed items are re-priced from today's menu, and minimums are not enforced here. Portion sizes are shown but can't be changed here.
- **Pickup / delivery**: switch between them, edit the Address, ZIP and Drop-off notes, and set the **Cook day** date. Changing the date moves the order to that week.
- **Payment**: Zelle / Cash / Card. Switching to or from Card adds or removes the card fee. **"Set the total by hand"** is optional; leave it blank to auto-calculate. A typed total always wins.
- **Notes**: Allergies / diet notes and Kitchen notes.
- Tap **Save changes**. Opening the dialog and saving without changes never re-prices an old order.

**Quotes (custom requests)**
- A quote card shows "Quote" instead of a price, with a **Price $** box and a **Set price** button. Set price saves the total and marks the order **confirmed**.
- The app does NOT text the customer the price. Text them yourself; the card's Text link helps. After that, their private order page shows the price and how to pay.
- Another option is to use **Edit** to add the real menu items, which prices the order automatically.

**Labels window ("Print labels")**
- The labels are a Word file for **3" × 2" sticker sheets (PLS504, 10 per sheet, 2 across × 5 down)**.
- One label per meal, one per pound (plus one for a half pound) and one per extra.
- Each label shows the meal name, the sides, the portion sizes, calories/protein/fat/carbs ("Macros: ask Juan" if you haven't entered them), "Contains: …" allergens, **Best by date** (cook day + 6 days) and "#order · name · 1 of N".
- **Sheet-spot picker**: tap the **first empty sticker** on the sheet in your printer (spots 1–10, left to right, top to bottom). It shows how many labels and sheets will print, and how many stickers will be left. The app remembers where the last print ended (on this device), so the next print starts at the right spot. **New sheet** resets to spot 1. **Download labels** gets the file.
- **Custom-order label editor**: for custom or quote orders the window starts with "1 · Meals on this order". Enter each meal's protein (and flavor), carb and veggie (or None), the amount of each, and how many meals. Tap the unit button to switch between **oz and g**. Macros are calculated from your saved macros ("Macros missing in Menu settings" if any part is missing). Use **+ Add another meal** for more lines, then "2 · Where to start", then **Save & download**. These lines are saved on the order and don't change its price.

### DM order (entering an order yourself)
1. Tap **+ DM order**. The order page opens in "Kitchen mode" with a "← Dashboard" link.
2. Build the meals, lbs or custom request just like a customer would.
3. At **Checkout**, a **Kitchen** section appears:
   - **Came in by**: Instagram DM, Text, Phone call, or In person / other.
   - **Cook date (Sunday)**: defaults to the current cook week; you can change it.
   - **Already paid** checkbox.
4. Fill in the customer info, pickup/delivery, payment, and tap **Place order**.
5. Then tap **+ Enter another order** or **Back to dashboard**.

DM orders work even when ordering is closed, the week is full, an item is sold out, or the ZIP is outside the area. The 8-meal and 4-lb minimums and the flavor picks still apply. No text and no alert is sent.

### Cook sheet tab
- "Cook sheet · [date]" lists the totals for the week.
- Top numbers: Meal containers, Protein to cook, Carbs and Veggies (in lb, cooked weight).
- Tables for Proteins (separated by flavor), Carbs and Veggies show Meals, Bulk lb, and **Total to cook** in lb. Bigger portions and extras are included.
- The **Paid orders only** checkbox and a **Print** button.
- **Labels / packing list**: every order with pickup or delivery, UNPAID marks, ⚠ allergies and its items.
- Cancelled orders are left out.

### Payments tab
- Top numbers: **Collected**, **Still owed**, and totals for Zelle, Cash and Card ("all in" or "$X owed").
- **Waiting on payment**: each unpaid order has a **Remind** button and a **Mark paid** button. Remind opens a text with the amount, Zelle info and memo #, or your card link.
- **Paid**: a list with **Undo**. Quotes with no price yet are not listed.

### Delivery tab
- "Monday route · N stops" starts from your **Kitchen address** (set it in Menu & settings).
- Stops are sorted by ZIP. Use **▲ ▼** to change the order.
- **Open route** opens Google Maps driving directions. Long routes split into links of 9 stops ("Open route 1/2").
- Each stop has the address (tap for Maps), drop-off notes, a text button ("On the way with your meals! ETA ~15 min.") and **Drop** to mark it delivered (shows **Dropped**; tap again to undo).
- Unpaid orders are marked UNPAID.

### Regulars tab
- This tab lists customers who have ordered in 2 or more different weeks: the number of weeks, the lifetime total and their "Usual" (last order).
- **Add to this week** copies their last order into the week you're viewing (unpaid, today's prices, source "Repeat"). **On this week** means they already ordered.
- **Add all N missing regulars** adds every regular who hasn't ordered this week.
- One-time customers are counted at the bottom but not shown.

### Messages tab (customer notifications)
- The tab shows how many customer phones have notifications on. Customers turn them on with the 🔔 in the app.
- **+ New message** adds a message (12 maximum): **Title** (60 characters max), **Message** (180 max) and an optional **Spanish version**.
- Press **Save changes** after typing, editing or deleting a message.
- **ON / OFF**: turning a message **ON** sends it to customers' phones right away. OFF just turns it off and sends nothing. Save changes first, or the app reminds you to.
- **Preview** shows how it looks on a phone (English or Spanish). **Send now / Send again** sends an ON message again. **Delete** removes it (then press Save changes).
- After sending, the message shows "Sent [date] to N phones".
- **Also pop up on the website**: tick this on a message to also show it as a pop-up to everyone who opens the home or order page (once per phone/computer) while the message is ON. Optional: **Show from / Until** dates, and a button (**Button text**, Spanish button text, and **Button goes to**, e.g. /order?code=LAUNCH10 to open the order page with a promo code applied). Turning it ON still also sends the phone notification to customers who have notifications on.

### Menu & settings tab
- **Customer texts**: shows if texts are **ON** or **OFF**. Texts stay OFF until the carrier approval (Twilio) is done and Orlando switches them on. Links to the Privacy, Terms and SMS opt-in pages.
- **Weekly sales report**: every **Monday at 8 PM**, last week's sales (Monday–Sunday) are emailed to the business email as an Excel file. It has the week's Orders and Summary sheets plus one tab per week so far. The button **Email last week's report now** sends it immediately. If email isn't connected, the card says OFF.
- **Ordering**: **Taking orders** switch (saves instantly); **Weekly cutoff day**, **Cutoff time**, **Max customers per week** (0 = no limit) and **Banner message** (press **Save** for these). It also shows the current cook day.
- **Share the order link**: your order page link with a **Copy** button. Put it in the IG bio or send it to people who DM.
- **Payment info** (shown after checkout): Zelle (name / phone / email), Card / Venmo payment link, Cash App link, Cash instructions, Card fee ($). Press **Save**.
- **Pickup & delivery**: Pickup window, Delivery window, Pickup address (customers see it), Kitchen address (private, the route start), Delivery fee ($), Delivery fee note, Delivery ZIPs (comma separated; blank = any). Press **Save**.
- **Menu: sold out · macros · allergens**: one row per protein, flavor, carb and veggie.
  - **Sold out** switch: saves instantly. Flavors don't have one; mark the protein itself sold out.
  - **Cal, P, C, F**: macros per standard portion (protein 4 oz, carb 4 oz, veggie 3 oz). Flavor rows can have their own numbers; leave them blank to use the base protein's. The app adds up each meal's macros once every part has numbers, and scales them for bigger portions.
  - **Allergen chips**: tap to switch each one on or off.
  - Press **Save macros & allergens**.

---

## 5. Common how-to recipes

**Mark an order paid**: on the Orders tab, tap the **Unpaid** button on the card (it turns to ✓ Paid), or use **Mark paid** in the Payments tab. To undo, tap it again or use **Undo** in Payments.

**Enter an order from an Instagram DM, text or call**: tap **+ DM order**, build the order, tap **Checkout**, set "Came in by", check the Cook date, tick **Already paid** if they paid, enter their name/phone/pickup or delivery/payment, then **Place order**.

**Change a price**: menu prices, upcharges, portion prices, minimums and the list of items are fixed in the app. Only the developer (Orlando) can change them. What you CAN change yourself: the card fee, the delivery fee, and the total of a single order (Edit → "Set the total by hand", or **Set price** for a quote).

**Mark an item sold out**: Menu & settings → Menu table → flip the **Sold out** switch on that item. It saves right away. Flip it back when it's available.

**Update macros or allergens**: Menu & settings → Menu table → type Cal / P / C / F for each item (per standard portion) and tap allergen chips → **Save macros & allergens**.

**Close ordering for a holiday**: Menu & settings → switch **Taking orders** off. Then type a **Banner message** (e.g. "No cook Nov 30 — happy Thanksgiving!") and press **Save**. Turn it back on afterwards and clear the banner. While it's off, the Thursday reminder text doesn't go out. You can still enter DM orders.

**Print labels**: on an order card tap **🏷️ Labels**, or **🏷️ All labels** for the whole cook day. Tap the first empty sticker on your sheet, then **Download labels**, and print the Word file on the 3" × 2" sheets. Enter macros first so the labels don't say "Macros: ask Juan".

**Send everyone a reminder**: Messages tab → **+ New message** → Title and Message (optional Spanish) → **Save changes** → tap **OFF** to turn it **ON**. That sends it immediately to everyone with notifications on. For text reminders, the automatic Thursday 4 PM text goes to customers who opted in (only when texts are ON).

**Run a discount / promo code**: Menu & settings → **Promo codes** → **+ Add code** (e.g. LAUNCH10, 10, % off) → **Save codes**. Share it, or tap **Copy link** and post the link so the code applies automatically.

**Find unpaid orders**: Orders tab → **Unpaid** filter, or the Payments tab → "Waiting on payment". "Still owed" shows the total.

**Move an order to next week**: open **Edit** on the order, change the **Cook day** date to the next Sunday, and **Save changes**. Don't use the **Next week** button for this: it makes a copy and leaves the original in this week.

**Repeat a regular's order**: Regulars tab → **Add to this week**, or **Add all N missing regulars**.

**Price a custom request**: find the quote (the **Custom quotes** or **Quotes** filter), type the price, tap **Set price**, then text the customer the price.

**Customer can't make it / order called off**: tap **Cancel** to keep a record. Use **Delete** only for mistakes or test orders.

**Limit customers or change the cutoff**: Menu & settings → **Max customers per week** or Weekly cutoff day / Cutoff time → **Save**.

**Plan the route / know what to cook**: Delivery tab (▲▼, **Open route**, **Drop**) and Cook sheet tab ("Paid orders only", **Print**).

**Get the week's numbers**: Orders tab top numbers, **Export Excel**, or **Email last week's report now**.

---

## 6. What the app can NOT do (ask Orlando, the developer)

- Add, remove or rename menu items, flavors, carbs or veggies.
- Change menu prices, flavor or side upcharges, bigger-portion prices, extra-portion prices, meal plans, the 8-meal or 4-lb minimums, or the portion sizes.
- Change the website's wording, photos, the Spanish translations, or the fixed note "Payment is due by Friday evening."
- Switch customer texts on (this needs carrier approval), connect the weekly email report, or fix push notifications that show a server or key error.
- Change the sticker sheet size or the label layout.
- Change the cook day from Sunday, the Thursday 4 PM reminder time, the Monday 8 PM report time or the 30-minute auto logout.
- Text customers a price automatically for quotes, or send custom one-off texts from the app. Use the Text and Remind links, which open your own phone's messages.
- Take card payments inside the app. The app only shows your payment links and instructions.
- Change the admin password.
- Handle a very busy week (300+ orders): the list needs a compact view.
- Any new feature, or anything that looks broken, shows an error, or won't save ("Could not save — refresh and try again" that keeps happening).

## 7. Rex (this help pop-up)
- Rex is the dino in the bottom corner of the admin page. Tap him and ask how anything in the app works, in English or Spanish. **New chat** clears the conversation; ✕ closes it.
- Rex only explains. He can't change orders, settings, prices or the app, and he can't text customers.
- Rex knows the app as described in this guide. When the app gets an update, the developer updates Rex's guide in the same update.
- If Rex isn't sure, or something looks broken, contact Orlando (the developer).

## 8. Promo codes (discounts)
- Create codes in **Menu & settings → Promo codes**: tap **+ Add code**, type the code (letters and numbers, e.g. LAUNCH10), the amount, and pick **% off** or **$ off**. Start and end dates are optional (the code only works from the start day through the end day, Pacific time; the checkout box only appears while a code is live). Then tap **Save codes**.
- The switch turns a code on or off. Off codes stop working right away, even for customers who already typed them. **Remove** deletes a code (then **Save codes**).
- Customers type the code in the **Promo code** box at checkout and tap **Apply**. The box only shows when at least one code is on. The discount comes off the food subtotal only, not the delivery fee or card fee.
- **Copy link** copies a link like dinomeals.app/order?code=LAUNCH10. Anyone who opens it gets the code applied automatically: great for Instagram bio, Stories and texts.
- Orders with a code show "🏷 CODE · −$X" on the order card; the receipt, private order page, Excel (Promo column and "Promo discounts" on the Summary) and the weekly report show the discount too.
- If you edit an order's items, its promo is re-figured for the new subtotal. **Next week** copies are full price (codes are one-time).
- Codes can't be limited to one use per customer yet, and can't apply only to certain items. Ask Orlando if you need that.
- DM orders you enter yourself can use a code too.
`;
