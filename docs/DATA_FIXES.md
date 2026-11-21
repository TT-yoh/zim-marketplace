# One-off data fixes on the live project

Changes made directly to live data (not schema), kept here so they can be understood or undone.

## 2026-11-21: Product categories

All 4,305 products were in `Uncategorized`, so every category filter in the shop was empty.
Migration 045 added five categories that fit the catalogue (an industrial / mining supplier):
Tools & Equipment, Plumbing & Pipes, Electrical & Power, Industrial & Mining, Safety & Workwear.

Products still in `Uncategorized` were then assigned by keywords in their title, checked in this
order (first match wins): Safety & Workwear → Solar & Energy → Auto Parts → Plumbing & Pipes →
Electrical & Power → Agriculture → Tools & Equipment → Industrial & Mining.

Result: Plumbing & Pipes 991, Industrial & Mining 720, Tools & Equipment 489, Electrical & Power 479,
Auto Parts 323, Safety & Workwear 232, Agriculture 207, Solar & Energy 46. 818 products whose
titles matched no keyword (odd spares such as carbon brushes or throttle pins) stay
`Uncategorized`; the vendor can set them from the dashboard's Edit form.

To undo: `update products set category = 'Uncategorized' where shop_id = '<store id>';`

## 2026-11-21: Order items found missing

The live project has 14 orders but 0 order items. The items were deleted before this date, most
likely by the old `ON DELETE CASCADE` from products or the client-side purge paths, both removed
(migration 044 and commit a5c6776). Recovering them needs a database backup from before the loss.
