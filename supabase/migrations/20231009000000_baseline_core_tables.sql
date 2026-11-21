-- 20231009000000_baseline_core_tables.sql
-- The original core tables were created by hand in the Supabase dashboard (and by the old
-- Express server's initDb.js), so no migration created them and a fresh database could not
-- be built: migration 20231010000000 starts with ALTER TABLE products.
--
-- This baseline recreates them with only their ORIGINAL columns; every later column, constraint
-- and foreign key is still added by the existing migrations (008/009 attach the vendor and auth
-- foreign keys, 006/035 add the order columns that reference other tables).
-- Column definitions match the live project as of 2026-11-14.
--
-- Everything is IF NOT EXISTS, so running it against the live project changes nothing.
-- The live project already has these tables; mark this version as applied there with:
--   npx supabase migration repair --status applied 20231009000000

-- Legacy tables from the Express prototype; migration 008 still alters shops
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    shop_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_intent_id VARCHAR(512),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_purchase_cents INTEGER NOT NULL,
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled'
);

CREATE TABLE IF NOT EXISTS public.vendor_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    available_balance_cents INTEGER NOT NULL DEFAULT 0,
    escrow_balance_cents INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shop_id, currency)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
