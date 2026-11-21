// Stub of the pre-035 Supabase schema used by the PGlite test suites.
// Only the tables, roles and auth helpers the hardening migrations depend on.
export const stub = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid primary key, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.uid', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.role', true), '') $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt', true), ''), '{}')::jsonb $$;
CREATE TABLE auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, factor_type text default 'totp', status text);
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
CREATE TABLE public.payout_requests (id uuid primary key default gen_random_uuid(), shop_id uuid, amount_cents int, currency varchar(3) default 'USD', status text default 'pending', admin_notes text, processed_at timestamptz);

CREATE FUNCTION public.admin_purge_all_orders() RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION public.request_vendor_payout(integer, text default 'ecocash', jsonb default '{}') RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.admin_process_payout(uuid, text, text default null) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.get_platform_financial_summary() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.fulfill_marketplace_order(target_order_id uuid, gateway_ref text) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION public.release_escrow(p_item_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION public.vendor_purge_inventory(target_shop_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE FUNCTION public.admin_delete_vendor_store(target_vendor_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
`;
