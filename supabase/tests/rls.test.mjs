// Row-level security regression tests for orders / order_items.
// Reproduces the live policy set from before migration 041 (copied from pg_policies on
// 2026-11-13), proves a buyer's checkout insert hit "infinite recursion", then applies 041 and
// checks checkout works and each role sees only what it should.
// Unlike ledger.test.mjs, queries here run as the non-owner `authenticated` role, so RLS applies.
// Run: npm run test:rls
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stub } from './stubSchema.mjs';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const read = (f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8');

const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS', msg); } else { fail++; console.log('FAIL', msg); } };

const U = {
  admin: '00000000-0000-0000-0000-00000000000a',
  vendor: '00000000-0000-0000-0000-00000000000b',
  buyer: '00000000-0000-0000-0000-00000000000c',
  other: '00000000-0000-0000-0000-00000000000d',
};

// Run SQL as a signed-in user (RLS enforced) inside a transaction
async function asUser(uid, fn) {
  await db.exec('BEGIN');
  try {
    await db.exec(`SELECT set_config('request.uid', '${uid}', true), set_config('request.role', 'authenticated', true); SET LOCAL ROLE authenticated;`);
    const out = await fn();
    await db.exec('COMMIT');
    return out;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}
const one = async (sql) => (await db.query(sql)).rows[0];

// --- schema: stub + hardening migrations + buyer_addresses + Supabase-style grants
await db.exec(stub);
await db.exec(`
  CREATE TABLE public.buyer_addresses (id uuid primary key default gen_random_uuid(), buyer_id uuid not null,
    full_name text, street_address text, city text, province text, phone_number text, is_default boolean);
  CREATE TABLE public.reviews (id uuid primary key default gen_random_uuid(), product_id uuid, buyer_id uuid, vendor_id uuid, rating int);
  CREATE TABLE public.categories (id uuid primary key default gen_random_uuid(), name text);
`);
for (const f of [
  '20231010000035_close_payment_and_escrow_exploits.sql',
  '20231010000037_lock_legacy_function_overloads.sql',
  '20231010000038_exclude_test_payments_from_financials.sql',
  '20231010000039_refunds_and_promo_codes.sql',
  '20231010000040_advisor_hardening.sql',
]) await db.exec(read(f));

await db.exec(`
  GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO authenticated, anon;
  GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
  ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.buyer_addresses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Public Read Access Products" ON public.products FOR SELECT USING (true);
  CREATE POLICY "Users can view their own addresses" ON public.buyer_addresses FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
  CREATE POLICY "Users can insert their own addresses" ON public.buyer_addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

  -- Live policies before 041 (pg_policies, 2026-11-13)
  CREATE FUNCTION public.is_vendor_for_order(p_order_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public
    AS $$ SELECT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id AND shop_id = auth.uid()); $$;
  CREATE POLICY "Admins only can delete orders" ON public.orders FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()));
  CREATE POLICY "Buyers and Admins can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK ((buyer_id = auth.uid()) OR EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()));
  CREATE POLICY "Buyers can insert their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
  CREATE POLICY "Buyers and Admins can view orders" ON public.orders FOR SELECT TO authenticated USING ((buyer_id = auth.uid()) OR EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()) OR (id IN (SELECT order_items.order_id FROM order_items WHERE order_items.shop_id = auth.uid())));
  CREATE POLICY "Buyers can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
  CREATE POLICY "Vendors can view orders for their items securely" ON public.orders FOR SELECT TO authenticated USING (is_vendor_for_order(id));
  CREATE POLICY "Admins only can update orders" ON public.orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()));
  CREATE POLICY "Admins only can delete order items" ON public.order_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()));
  CREATE POLICY "Buyers can insert their order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (order_id IN (SELECT orders.id FROM orders WHERE orders.buyer_id = auth.uid()));
  CREATE POLICY "Users and Admins can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK ((order_id IN (SELECT orders.id FROM orders WHERE orders.buyer_id = auth.uid())) OR EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()));
  CREATE POLICY "Buyers can view their order items" ON public.order_items FOR SELECT TO authenticated USING (order_id IN (SELECT orders.id FROM orders WHERE orders.buyer_id = auth.uid()));
  CREATE POLICY "Users and Admins can view order items" ON public.order_items FOR SELECT TO authenticated USING ((shop_id = auth.uid()) OR (order_id IN (SELECT orders.id FROM orders WHERE orders.buyer_id = auth.uid())) OR EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()));
  CREATE POLICY "Vendors can view order items for their shop" ON public.order_items FOR SELECT TO authenticated USING (shop_id = auth.uid());
  CREATE POLICY "Vendors and Admins can update order items" ON public.order_items FOR UPDATE TO authenticated USING ((shop_id = auth.uid()) OR EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()));
  CREATE POLICY "Vendors can update order items for their shop" ON public.order_items FOR UPDATE TO authenticated USING (shop_id = auth.uid());
  CREATE POLICY "Vendors can view shipping addresses securely" ON public.buyer_addresses FOR SELECT TO authenticated USING (id IN (SELECT shipping_address_id FROM orders WHERE is_vendor_for_order(orders.id)));
`);

// --- data (as owner)
await db.exec(`
  INSERT INTO platform_admins VALUES ('${U.admin}');
  INSERT INTO vendor_profiles (id, store_name, whatsapp_number) VALUES ('${U.vendor}', 'V', '1'), ('${U.other}', 'Other', '2');
`);
const productId = (await one(`INSERT INTO products (shop_id, title, price_cents, stock_quantity) VALUES ('${U.vendor}', 'P', 1000, 10) RETURNING id`)).id;

// Checkout as the app does it: insert ... returning (select)
const checkout = (uid) => asUser(uid, async () => {
  const addr = (await db.query(`INSERT INTO buyer_addresses (buyer_id, full_name, street_address, city, province, phone_number)
                                VALUES ('${uid}', 'B', '1 St', 'Harare', 'Harare', '0771234567') RETURNING id`)).rows[0].id;
  const order = (await db.query(`INSERT INTO orders (buyer_id, shipping_address_id, fulfillment_type) VALUES ('${uid}', '${addr}', 'pickup') RETURNING id, status`)).rows[0];
  await db.query(`INSERT INTO order_items (order_id, product_id, quantity) VALUES ('${order.id}', '${productId}', 1)`);
  const total = (await db.query(`SELECT total_amount_cents FROM orders WHERE id = '${order.id}'`)).rows[0].total_amount_cents;
  return { orderId: order.id, total };
});

// 1. Before 041: the recursion bug
try {
  await checkout(U.buyer);
  ok(false, 'pre-041 checkout should fail with infinite recursion (bug not reproduced)');
} catch (e) {
  ok(/infinite recursion/.test(e.message), `pre-041 checkout reproduces the live bug: ${e.message.split('\n')[0]}`);
}

// 2. Apply 041
await db.exec(read('20231010000041_fix_orders_rls_recursion.sql'));

// 3. Checkout now works for a buyer
let order;
try {
  order = await checkout(U.buyer);
  ok(order.total === 1000, `post-041 buyer checkout works (total ${order.total})`);
} catch (e) {
  ok(false, `post-041 checkout failed: ${e.message.split('\n')[0]}`);
}

if (order) {
  // 4. Visibility
  const vis = async (uid) => asUser(uid, async () => ({
    orders: Number((await one(`SELECT count(*) c FROM orders WHERE id = '${order.orderId}'`)).c),
    items: Number((await one(`SELECT count(*) c FROM order_items WHERE order_id = '${order.orderId}'`)).c),
    addresses: Number((await one(`SELECT count(*) c FROM buyer_addresses`)).c),
  }));
  const b = await vis(U.buyer), v = await vis(U.vendor), o = await vis(U.other), a = await vis(U.admin);
  ok(b.orders === 1 && b.items === 1 && b.addresses === 1, `buyer sees own order, items, address (${JSON.stringify(b)})`);
  ok(v.orders === 1 && v.items === 1 && v.addresses === 1, `vendor sees order, its item and shipping address (${JSON.stringify(v)})`);
  ok(o.orders === 0 && o.items === 0 && o.addresses === 0, `unrelated vendor sees nothing (${JSON.stringify(o)})`);
  ok(a.orders === 1 && a.items === 1, `admin sees the order (${JSON.stringify(a)})`);

  // 5. Another user can't add items to someone else's order
  try {
    await asUser(U.other, () => db.query(`INSERT INTO order_items (order_id, product_id, quantity) VALUES ('${order.orderId}', '${productId}', 1)`));
    ok(false, 'other user added an item to the buyer\'s order');
  } catch (e) {
    ok(/row-level security|violates/.test(e.message), 'other user cannot add items to the buyer\'s order');
  }

  // 6. Buyer cannot change order status directly
  const updated = await asUser(U.buyer, async () => (await db.query(`UPDATE orders SET status = 'paid' WHERE id = '${order.orderId}' RETURNING id`)).rows.length);
  ok(updated === 0, 'buyer cannot mark own order paid via UPDATE');
}

// 7. Vendor's own-store checkout is still blocked by the trigger
try {
  await checkout(U.vendor);
  ok(false, 'vendor bought from own store');
} catch (e) {
  ok(/own store/.test(e.message), 'vendor cannot buy from own store');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
