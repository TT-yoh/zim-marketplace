-- supabase/seed.sql
-- LOCAL DEVELOPMENT DATA ONLY. Loaded by `npx supabase start` / `npx supabase db reset` into the
-- local Docker stack. It is never run against the live project (`db push` does not run seeds).
--
-- Test accounts (password for all: zimmarket-local-dev):
--   admin@zimmarket.local      platform admin, also shops as a buyer
--   buyer@zimmarket.local      buyer with a saved address and one shipped order
--   vendor@zimmarket.local     verified vendor "Harare Hardware" with products and a valid WhatsApp
--   newvendor@zimmarket.local  brand-new unverified vendor with no products (setup checklist)

-- Act as the service role so the privilege triggers (e.g. forcing new vendors unverified) allow seeding
select set_config('request.jwt.claim.role', 'service_role', false);
select set_config('request.jwt.claims', '{"role":"service_role"}', false);

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('zimmarket-local-dev', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', u.meta, now(), now(), '', '', '', ''
from (values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@zimmarket.local',     '{"full_name":"Local Admin","role":"buyer"}'::jsonb),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'buyer@zimmarket.local',     '{"full_name":"Tendai Buyer","role":"buyer"}'::jsonb),
    ('c0000000-0000-4000-8000-000000000003'::uuid, 'vendor@zimmarket.local',    '{"store_name":"Harare Hardware","role":"vendor"}'::jsonb),
    ('d0000000-0000-4000-8000-000000000004'::uuid, 'newvendor@zimmarket.local', '{"store_name":"New Store","role":"vendor"}'::jsonb)
) as u(id, email, meta);

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u where u.email like '%@zimmarket.local';

-- ---------------------------------------------------------------------------
-- Roles and profiles
-- ---------------------------------------------------------------------------
insert into public.platform_admins (id) values ('a0000000-0000-4000-8000-000000000001');

insert into public.vendor_profiles (id, store_name, store_slug, whatsapp_number, is_verified, is_active,
                                    bio, business_address, operating_hours, id_document_url, shipping_settings)
values
    ('c0000000-0000-4000-8000-000000000003', 'Harare Hardware', 'harare-hardware', '263771234567', true, true,
     'Tools, plumbing and building supplies in Harare CBD.', '12 Kaguvi Street, Harare', 'Mon - Sat: 8:00 AM - 5:00 PM',
     'c0000000-0000-4000-8000-000000000003/id.jpg',
     '{"mode":"flat","flat_fee_cents":400,"free_shipping_threshold_cents":20000,"pickup_enabled":true,"custom_zones":{}}'),
    ('d0000000-0000-4000-8000-000000000004', 'New Store', 'new-store', '263770000000', false, true,
     null, null, null, null, null);

insert into public.buyer_addresses (id, buyer_id, full_name, street_address, city, province, phone_number, is_default)
values ('e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'Tendai Buyer',
        '45 Samora Machel Ave', 'Harare', 'Harare', '0772345678', true);

-- ---------------------------------------------------------------------------
-- Products (vendor: Harare Hardware)
-- ---------------------------------------------------------------------------
insert into public.products (id, shop_id, title, description, price_cents, stock_quantity, category, condition,
                             is_promotion, promo_discount_percent, item_no, unit)
values
    ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003', 'Cordless Drill 18V', 'Two batteries and charger included.', 8999, 12, 'Home & Hardware', 'New', false, 0, 'HH-001', 'EA'),
    ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003', 'Solar Panel 400W', 'Monocrystalline panel.', 15500, 6, 'Solar & Energy', 'New', true, 20, 'HH-002', 'EA'),
    ('f0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Deep Cycle Battery 200Ah', 'Gel battery for solar backup.', 22000, 4, 'Solar & Energy', 'New', false, 0, 'HH-003', 'EA'),
    ('f0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000003', 'Car Battery 12V 70Ah', 'Maintenance-free.', 9500, 10, 'Auto Parts', 'New', true, 10, 'HH-004', 'EA'),
    ('f0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003', 'Water Pump 0.5hp', 'Borehole pump.', 12606, 3, 'Agriculture', 'Refurbished', false, 0, 'HH-005', 'EA'),
    ('f0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'PVC Pipe 6m', 'Class 6, 50mm.', 1250, 200, 'Home & Hardware', 'New', false, 0, 'HH-006', 'EA'),
    ('f0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000003', 'Custom Steel Gate', 'Made to order: ask for a quote.', 0, 5, 'Home & Hardware', 'New', false, 0, 'HH-007', 'EA'),
    ('f0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000003', 'Inverter 5kVA', 'Out of stock: restocking soon.', 45000, 0, 'Solar & Energy', 'New', false, 0, 'HH-008', 'EA');

-- ---------------------------------------------------------------------------
-- One paid order for the buyer, already shipped (exercises My Orders, Fulfilment, escrow)
-- ---------------------------------------------------------------------------
insert into public.orders (id, buyer_id, total_amount_cents, shipping_address_id, fulfillment_type, delivery_zone)
values ('10000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 0,
        'e0000000-0000-4000-8000-000000000005', 'courier', 'harare_cbd');

-- Pricing, stock and totals are applied by the order triggers, exactly as for a real checkout
insert into public.order_items (order_id, product_id, quantity)
values ('10000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 1),
       ('10000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000006', 4);

select public.recompute_order_totals('10000000-0000-4000-8000-000000000001');

select public.fulfill_marketplace_order(
    '10000000-0000-4000-8000-000000000001',
    'SEED-PAYMENT-1',
    (select total_amount_cents from public.orders where id = '10000000-0000-4000-8000-000000000001')
);

-- Vendor has shipped the drill; the pipes are still to be shipped
select set_config('zimmarket.ledger_op', 'on', false);
-- (shipped_at set explicitly: ledger ops skip the automatic stamp from migration 046)
update public.order_items set status = 'shipped', shipped_at = now() - interval '2 days'
where order_id = '10000000-0000-4000-8000-000000000001' and product_id = 'f0000000-0000-4000-8000-000000000001';
select set_config('zimmarket.ledger_op', 'off', false);

-- Reset the session settings used above
select set_config('request.jwt.claim.role', '', false);
select set_config('request.jwt.claims', '', false);
