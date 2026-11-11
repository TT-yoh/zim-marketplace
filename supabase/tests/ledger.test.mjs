// Ledger & security regression tests.
// Applies the hardening migrations (035+) to an in-memory Postgres (PGlite) on top of a stub of
// the older Supabase schema, then exercises the payment, escrow, refund and privilege paths.
// RLS policies are not exercised here (PGlite runs as superuser); triggers and functions are.
// Run: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
// 036 only schedules pg_cron, which PGlite does not ship
const MIGRATIONS = [
  '20231010000035_close_payment_and_escrow_exploits.sql',
  '20231010000037_lock_legacy_function_overloads.sql',
  '20231010000038_exclude_test_payments_from_financials.sql',
  '20231010000039_refunds_and_promo_codes.sql',
  '20231010000040_advisor_hardening.sql',
];
const db = new PGlite();

const stub = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid primary key, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.uid', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.role', true), '') $$;
CREATE TABLE storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
CREATE TABLE storage.buckets (id text primary key, name text, public boolean);
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_admins (id uuid primary key);
CREATE TABLE public.vendor_profiles (
  id uuid primary key, store_name text, whatsapp_number text, is_verified boolean default false,
  rating numeric(3,2) default 0, is_active boolean default true, commission_rate_percent numeric(5,2) default 10.00,
  shipping_settings jsonb, is_featured_hero boolean, created_at timestamptz default now());
CREATE TABLE public.products (id uuid primary key default gen_random_uuid(), shop_id uuid references vendor_profiles(id),
  title text, price_cents int not null, stock_quantity int not null default 0, is_promotion boolean default false,
  promo_discount_percent int default 0, is_featured_hero boolean default false);
CREATE TABLE public.orders (id uuid primary key default gen_random_uuid(), buyer_id uuid, total_amount_cents int not null default 0,
  currency varchar(3) default 'USD', payment_intent_id varchar(512), status varchar(50) default 'pending',
  shipping_address_id uuid, shipping_fee_cents int default 0, shipping_fee_released boolean default false,
  created_at timestamptz default now());
CREATE TABLE public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid references orders(id),
  product_id uuid references products(id), shop_id uuid references vendor_profiles(id), quantity int not null default 1,
  price_at_purchase_cents int not null default 0, status text default 'pending');
CREATE TABLE public.vendor_balances (shop_id uuid references vendor_profiles(id), currency varchar(3) default 'USD',
  available_balance_cents int default 0, escrow_balance_cents int default 0, updated_at timestamptz, primary key (shop_id, currency));
CREATE TABLE public.platform_earnings (id uuid primary key default gen_random_uuid(), order_id uuid, order_item_id uuid,
  source_shop_id uuid, amount_cents int not null check (amount_cents >= 0), currency varchar(3) default 'USD',
  commission_percent numeric(5,2) default 10 not null, status text default 'pending_escrow' not null, created_at timestamptz default now(), cleared_at timestamptz);
CREATE TABLE public.payout_requests (id uuid primary key default gen_random_uuid(), shop_id uuid, amount_cents int, currency varchar(3) default 'USD', status text default 'pending');

CREATE FUNCTION public.admin_purge_all_orders() RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION public.request_vendor_payout(integer, text default 'ecocash', jsonb default '{}') RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.admin_process_payout(uuid, text, text default null) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.get_platform_financial_summary() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.fulfill_marketplace_order(target_order_id uuid, gateway_ref text) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION public.release_escrow(p_item_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION public.vendor_purge_inventory(target_shop_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION public.admin_delete_vendor_store(target_vendor_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
`;

const U = { admin: '00000000-0000-0000-0000-00000000000a', vendor: '00000000-0000-0000-0000-00000000000b',
            buyer: '00000000-0000-0000-0000-00000000000c' };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const as = async (uid, role) => {
  await db.exec(`SELECT set_config('request.uid', '${uid || ''}', false), set_config('request.role', '${role || ''}', false)`);
};
const expectErr = async (sql, re, m) => {
  try { await db.exec(sql); ok(false, m + ' (no error)'); }
  catch (e) { ok(re.test(e.message), `${m} -> ${e.message.split('\n')[0]}`); }
};
const one = async (sql) => (await db.query(sql)).rows[0];

await db.exec(stub);
for (const file of MIGRATIONS) {
  await db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
}
console.log(`applied ${MIGRATIONS.length} migrations`);

// Setup as service role (no auth.uid)
await as(null, 'service_role');
await db.exec(`INSERT INTO platform_admins VALUES ('${U.admin}');
  INSERT INTO vendor_profiles (id, store_name, whatsapp_number, shipping_settings) VALUES
   ('${U.vendor}', 'V', '1', '{"mode":"flat","flat_fee_cents":500}');`);
const prod = (await one(`INSERT INTO products (shop_id, title, price_cents, stock_quantity) VALUES ('${U.vendor}', 'P', 10000, 5) RETURNING id`)).id;

// C4: vendor self-verify on insert / commission tamper
await as(U.buyer, 'authenticated');
await db.exec(`INSERT INTO vendor_profiles (id, store_name, whatsapp_number, is_verified, commission_rate_percent) VALUES ('${U.buyer}', 'B', '2', true, -100)`);
const bp = await one(`SELECT is_verified, commission_rate_percent FROM vendor_profiles WHERE id='${U.buyer}'`);
ok(bp.is_verified === false && Number(bp.commission_rate_percent) === 10, 'C4 insert cannot self-verify or set commission');
await expectErr(`UPDATE vendor_profiles SET commission_rate_percent = 0 WHERE id='${U.buyer}'`, /commission/, 'C4 update commission blocked');
await expectErr(`UPDATE vendor_profiles SET is_verified = true WHERE id='${U.buyer}'`, /KYC/, 'C4 update is_verified blocked');

// C3: buyer-supplied totals/status ignored
const ord = (await one(`INSERT INTO orders (buyer_id, total_amount_cents, status, shipping_fee_cents, currency, fulfillment_type, delivery_zone, promo_code)
  VALUES ('${U.buyer}', 1, 'paid', 999999, 'ZWG', 'courier', 'harare_cbd', 'zim10') RETURNING id`)).id;
let o = await one(`SELECT * FROM orders WHERE id='${ord}'`);
ok(o.status === 'pending' && o.total_amount_cents === 0 && o.currency === 'USD', 'C3 order insert forces pending/0/USD');
await db.exec(`INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase_cents, shop_id) VALUES ('${ord}', '${prod}', 2, 1, '${U.buyer}')`);
o = await one(`SELECT * FROM orders WHERE id='${ord}'`);
ok(o.items_subtotal_cents === 20000 && o.shipping_fee_cents === 500 && o.discount_cents === 2000 && o.total_amount_cents === 18500,
   `C3 server totals (sub ${o.items_subtotal_cents}, ship ${o.shipping_fee_cents}, disc ${o.discount_cents}, total ${o.total_amount_cents})`);
ok((await one(`SELECT stock_quantity s FROM products WHERE id='${prod}'`)).s === 3, 'H8 stock reserved atomically');
await expectErr(`INSERT INTO order_items (order_id, product_id, quantity) VALUES ('${ord}', '${prod}', 10)`, /Insufficient stock/, 'H8 oversell blocked');

// C2: release before payment
const item = (await one(`SELECT id FROM order_items WHERE order_id='${ord}'`)).id;
await expectErr(`SELECT release_escrow('${item}')`, /not been paid/, 'C2 release on unpaid order blocked');
await as(null, '');
await expectErr(`SELECT release_escrow('${item}')`, /Authentication required/, 'C2 anonymous release blocked');

// H7: vendor sets delivered directly
await as(U.vendor, 'authenticated');
await expectErr(`UPDATE order_items SET status='delivered' WHERE id='${item}'`, /release_escrow/, 'H7 direct delivered blocked');
await expectErr(`UPDATE order_items SET status='shipped' WHERE id='${item}'`, /unpaid/, 'H7 cannot ship unpaid order');

// C1: privileges
const priv = await one(`SELECT has_function_privilege('authenticated', 'public.fulfill_marketplace_order(uuid,text,integer)', 'EXECUTE') a,
  has_function_privilege('anon', 'public.fulfill_marketplace_order(uuid,text,integer)', 'EXECUTE') b,
  has_function_privilege('anon', 'public.release_escrow(uuid)', 'EXECUTE') c,
  has_function_privilege('authenticated', 'public.release_escrow(uuid)', 'EXECUTE') d,
  to_regprocedure('public.fulfill_marketplace_order(uuid,text)') e`);
ok(!priv.a && !priv.b && !priv.c && priv.d && priv.e === null, 'C1 fulfill not executable by clients; old 2-arg version dropped');

// Payment initiated -> items locked
await as(null, 'service_role');
await db.exec(`UPDATE orders SET payment_intent_id='poll' WHERE id='${ord}'`);
await as(U.buyer, 'authenticated');
await expectErr(`INSERT INTO order_items (order_id, product_id, quantity) VALUES ('${ord}', '${prod}', 1)`, /locked/, 'C3 items locked after payment start');

// Underpayment rejected, correct payment fulfills, retry idempotent
await as(null, 'service_role');
await expectErr(`SELECT fulfill_marketplace_order('${ord}', 'ref', 1)`, /Amount mismatch/, 'C1 underpayment rejected');
await db.exec(`SELECT fulfill_marketplace_order('${ord}', 'ref', 18500)`);
await db.exec(`SELECT fulfill_marketplace_order('${ord}', 'ref', 18500)`);
let bal = await one(`SELECT * FROM vendor_balances WHERE shop_id='${U.vendor}'`);
ok(bal.escrow_balance_cents === 18000 + 500 && bal.available_balance_cents === 0, `escrow credited once (escrow ${bal.escrow_balance_cents})`);

// Commission change after payment does not change release amount
await as(U.admin, 'authenticated');
await db.exec(`UPDATE vendor_profiles SET commission_rate_percent = 50 WHERE id='${U.vendor}'`);
await as(U.vendor, 'authenticated');
await db.exec(`UPDATE order_items SET status='shipped' WHERE id='${item}'`);
await expectErr(`SELECT release_escrow('${item}')`, /Only the buyer/, 'vendor cannot release own escrow');
await as(U.buyer, 'authenticated');
await db.exec(`SELECT release_escrow('${item}')`);
bal = await one(`SELECT * FROM vendor_balances WHERE shop_id='${U.vendor}'`);
ok(bal.available_balance_cents === 18500 && bal.escrow_balance_cents === 0, `release uses snapshot + shipping (avail ${bal.available_balance_cents}, escrow ${bal.escrow_balance_cents})`);
const pe = await one(`SELECT status, amount_cents FROM platform_earnings`);
ok(pe.status === 'cleared' && pe.amount_cents === 2000, 'platform commission cleared');

// Self-purchase blocked
const own = (await one(`INSERT INTO orders (buyer_id) VALUES ('${U.vendor}') RETURNING id`)).id;
await as(U.vendor, 'authenticated');
await expectErr(`INSERT INTO order_items (order_id, product_id, quantity) VALUES ('${own}', '${prod}', 1)`, /own store/, 'self-purchase blocked');

// H8 expiry restores stock
await as(U.buyer, 'authenticated');
const stale = (await one(`INSERT INTO orders (buyer_id) VALUES ('${U.buyer}') RETURNING id`)).id;
await db.exec(`INSERT INTO order_items (order_id, product_id, quantity) VALUES ('${stale}', '${prod}', 2)`);
await as(null, 'service_role');
await db.exec(`UPDATE orders SET created_at = now() - interval '3 hours' WHERE id='${stale}'`);
const n = (await one(`SELECT expire_stale_pending_orders() n`)).n;
ok(n === 1 && (await one(`SELECT stock_quantity s FROM products WHERE id='${prod}'`)).s === 3, 'H8 stale order expired, stock restored');

// H9: purge keeps paid history; anonymous purge blocked
await as(null, '');
await expectErr(`SELECT vendor_purge_inventory('${U.vendor}')`, /Access denied/, 'H9 anonymous purge blocked');
await as(U.vendor, 'authenticated');
await db.exec(`SELECT vendor_purge_inventory('${U.vendor}')`);
ok((await one(`SELECT count(*)::int c FROM order_items WHERE order_id='${ord}'`)).c === 1, 'H9 paid order items preserved');
await as(U.admin, 'authenticated');
await expectErr(`SELECT admin_delete_vendor_store('${U.vendor}')`, /balances/, 'H9 store with balance not deleted');

// 039: vendor-funded promo codes and refunds
await as(U.admin, 'authenticated');
await db.exec(`INSERT INTO promo_codes (code, label, kind, percent_off, funded_by) VALUES ('VEND20', '20% off', 'percent_off', 20, 'vendor')`);
await db.exec(`UPDATE vendor_profiles SET commission_rate_percent = 10 WHERE id='${U.vendor}'`); // earlier test set 50%
await as(null, 'service_role');
const prod2 = (await one(`INSERT INTO products (shop_id, title, price_cents, stock_quantity) VALUES ('${U.vendor}', 'P2', 10000, 4) RETURNING id`)).id;
await as(U.buyer, 'authenticated');
const ord2 = (await one(`INSERT INTO orders (buyer_id, fulfillment_type, promo_code) VALUES ('${U.buyer}', 'pickup', 'vend20') RETURNING id`)).id;
await db.exec(`INSERT INTO order_items (order_id, product_id, quantity) VALUES ('${ord2}', '${prod2}', 1)`);
o = await one(`SELECT * FROM orders WHERE id='${ord2}'`);
ok(o.discount_cents === 2000 && o.total_amount_cents === 8000 && o.discount_funded_by === 'vendor', 'promo from table: vendor-funded 20%');
await as(null, 'service_role');
const escrowBefore = (await one(`SELECT escrow_balance_cents e FROM vendor_balances WHERE shop_id='${U.vendor}' AND currency='USD'`)).e;
await db.exec(`SELECT fulfill_marketplace_order('${ord2}', 'ref2', 8000)`);
const item2 = await one(`SELECT id, vendor_net_cents, discount_share_cents FROM order_items WHERE order_id='${ord2}'`);
ok(item2.vendor_net_cents === 7200 && item2.discount_share_cents === 2000, `vendor-funded discount lowers vendor cut (net ${item2.vendor_net_cents})`);

await as(U.admin, 'authenticated');
await expectErr(`UPDATE order_items SET status='refunded' WHERE id='${item2.id}'`, /admin_refund_order_item/, 'direct refunded status blocked, even for admins');
await as(U.buyer, 'authenticated');
await expectErr(`SELECT admin_refund_order_item('${item2.id}')`, /not a platform admin/, 'buyer cannot refund');
await as(U.admin, 'authenticated');
const refund = (await one(`SELECT admin_refund_order_item('${item2.id}', 'test') r`)).r;
ok(refund.amount_cents === 8000, `refund owed equals what buyer paid (${refund.amount_cents})`);
const after = await one(`SELECT
  (SELECT escrow_balance_cents FROM vendor_balances WHERE shop_id='${U.vendor}' AND currency='USD') e,
  (SELECT stock_quantity FROM products WHERE id='${prod2}') s,
  (SELECT status FROM orders WHERE id='${ord2}') os,
  (SELECT string_agg(status, ',') FROM platform_earnings WHERE order_item_id='${item2.id}') pe`);
ok(after.e === escrowBefore && after.s === 4 && after.os === 'refunded' && after.pe === 'refunded',
   `refund reverses escrow, stock and commission (escrow ${after.e}, stock ${after.s}, order ${after.os}, earnings ${after.pe})`);
await expectErr(`SELECT admin_refund_order_item('${item2.id}')`, /already refunded|order is refunded/, 'double refund blocked');
await as(U.buyer, 'authenticated');
await expectErr(`SELECT release_escrow('${item2.id}')`, /not been paid|refunded/, 'refunded item cannot be released');
await as(U.admin, 'authenticated');
await expectErr(`SELECT admin_mark_refund_paid('${refund.refund_id}', '  ')`, /reference/, 'refund paid needs a reference');
await db.exec(`SELECT admin_mark_refund_paid('${refund.refund_id}', 'MP123')`);
ok((await one(`SELECT status FROM refunds WHERE id='${refund.refund_id}'`)).status === 'paid', 'refund marked paid');

// 038: test payments excluded from the financial summary
const summary = (await one(`SELECT get_platform_financial_summary() s`)).s;
ok(summary.test_orders_count === 0 && summary.success === true, 'financial summary runs for admins');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
