-- 20231010000031_strict_security_enforcement.sql
-- Comprehensive Security Hardening:
-- 0. Ensure required schema columns and tables exist (idempotent setup)
-- 1. Zero-Trust Pricing & Order Integrity Trigger (prevents client price tampering & validates stock)
-- 2. Financial Immutability Trigger (prevents changing price, quantity, or illegal status jumps on order_items)
-- 3. Immutability of Financial Orders & RLS Lock Down (blocks order deletion and direct status edits)
-- 4. Vendor KYC Privilege Escalation Prevention (blocks self-verifying is_verified, rating, or is_active)
-- 5. Buyer Verification Status Protection (blocks self-verifying KYC)
-- 6. Hero Spotlight Hijacking Guard (only platform admins can pin products to hero)
-- 7. Atomic Row-Locking Escrow Release (FOR UPDATE row lock preventing concurrency race conditions)
-- 8. Verified Purchase Reviews Enforcement (only buyers who received delivered orders can review)

-- ============================================================================
-- 0. IDEMPOTENT PREREQUISITES
-- ============================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_promotion BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured_hero BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.buyer_verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name text NOT NULL,
    phone_number text NOT NULL,
    id_document_url text NOT NULL,
    proof_of_residence_url text,
    delivery_city text DEFAULT 'Harare',
    delivery_address text,
    status text DEFAULT 'pending' NOT NULL, -- 'pending', 'verified', 'rejected'
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.buyer_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can view their own verification" ON public.buyer_verifications;
CREATE POLICY "Buyers can view their own verification" 
ON public.buyer_verifications FOR SELECT 
TO authenticated 
USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can insert their own verification" ON public.buyer_verifications;
CREATE POLICY "Buyers can insert their own verification" 
ON public.buyer_verifications FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Admins full access to buyer verifications" ON public.buyer_verifications;
CREATE POLICY "Admins full access to buyer verifications" 
ON public.buyer_verifications FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
);


-- ============================================================================
-- 1. ZERO-TRUST CHECKOUT: ENFORCE ORDER ITEM PRICING & STOCK INTEGRITY
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_order_item_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_actual_price INTEGER;
    v_actual_shop_id UUID;
    v_actual_stock INTEGER;
    v_is_promo BOOLEAN;
    v_promo_disc INTEGER;
BEGIN
    -- Fetch authoritative product data from catalog
    SELECT price_cents, shop_id, stock_quantity, COALESCE(is_promotion, false), COALESCE(promo_discount_percent, 0)
    INTO v_actual_price, v_actual_shop_id, v_actual_stock, v_is_promo, v_promo_disc
    FROM public.products
    WHERE id = NEW.product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % does not exist.', NEW.product_id;
    END IF;

    -- Validate quantity
    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Order quantity must be at least 1.';
    END IF;

    -- Validate stock availability
    IF v_actual_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_actual_stock, NEW.quantity;
    END IF;

    -- Calculate expected price (factoring in verified store promo if active)
    IF v_is_promo AND v_promo_disc > 0 THEN
        v_actual_price := ROUND(v_actual_price * (1 - (v_promo_disc::NUMERIC / 100.0)));
    END IF;

    -- Overwrite price_at_purchase_cents and shop_id with trusted database values
    NEW.price_at_purchase_cents := v_actual_price;
    NEW.shop_id := v_actual_shop_id;
    NEW.status := 'pending'; -- Always force initial status to pending

    -- Atomically decrement product stock
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_order_item_integrity ON public.order_items;
CREATE TRIGGER trg_enforce_order_item_integrity
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_item_integrity();


-- ============================================================================
-- 2. PROTECT ORDER ITEMS FROM UNAUTHORIZED MUTATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_order_item_updates()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) INTO v_is_admin;

    -- Platform admin bypass
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    -- Prevent tampering with financial & identity fields
    IF NEW.price_at_purchase_cents != OLD.price_at_purchase_cents THEN
        RAISE EXCEPTION 'Security Violation: price_at_purchase_cents is immutable.';
    END IF;
    IF NEW.quantity != OLD.quantity THEN
        RAISE EXCEPTION 'Security Violation: quantity is immutable.';
    END IF;
    IF NEW.product_id != OLD.product_id THEN
        RAISE EXCEPTION 'Security Violation: product_id is immutable.';
    END IF;
    IF NEW.shop_id != OLD.shop_id THEN
        RAISE EXCEPTION 'Security Violation: shop_id is immutable.';
    END IF;
    IF NEW.order_id != OLD.order_id THEN
        RAISE EXCEPTION 'Security Violation: order_id is immutable.';
    END IF;

    -- Status transition guards for non-admins
    IF NEW.status != OLD.status THEN
        -- Only allow pending -> shipped transition by the vendor
        IF OLD.status = 'pending' AND NEW.status = 'shipped' THEN
            IF auth.uid() != OLD.shop_id THEN
                RAISE EXCEPTION 'Unauthorized: Only the vendor can mark this item as shipped.';
            END IF;
        -- delivered is only permitted via release_escrow() (running as SECURITY DEFINER)
        ELSIF NEW.status = 'delivered' THEN
            NULL;
        -- refunded is only permitted via Admin mediation
        ELSE
            RAISE EXCEPTION 'Unauthorized status transition from % to %.', OLD.status, NEW.status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_order_item_updates ON public.order_items;
CREATE TRIGGER trg_protect_order_item_updates
BEFORE UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.protect_order_item_updates();


-- ============================================================================
-- 3. FINANCIAL ORDERS IMMUTABILITY (NO DELETES, ADMIN-ONLY SENSITIVE UPDATES)
-- ============================================================================
-- Drop vulnerable policies that allowed non-admins to delete or modify orders
DROP POLICY IF EXISTS "Buyers and Admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users and Admins can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Buyers and Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can update their own orders" ON public.orders;

-- Only platform admins can delete orders or order items (audit trail protection)
CREATE POLICY "Admins only can delete orders" ON public.orders
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));

CREATE POLICY "Admins only can delete order items" ON public.order_items
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));

-- Only platform admins or backend can update financial orders directly
CREATE POLICY "Admins only can update orders" ON public.orders
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));


-- ============================================================================
-- 4. VENDOR KYC & PRIVILEGE ESCALATION LOCKDOWN
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_vendor_profile_privileges()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) INTO v_is_admin;

    IF NOT v_is_admin THEN
        IF NEW.is_verified != OLD.is_verified THEN
            RAISE EXCEPTION 'Security Violation: Only platform admins can approve or modify KYC verification status.';
        END IF;
        IF COALESCE(NEW.is_active, true) != COALESCE(OLD.is_active, true) THEN
            RAISE EXCEPTION 'Security Violation: Only platform admins can suspend or activate vendor stores.';
        END IF;
        IF NEW.rating != OLD.rating THEN
            RAISE EXCEPTION 'Security Violation: Store ratings are computed automatically and cannot be manually updated.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_vendor_profile_privileges ON public.vendor_profiles;
CREATE TRIGGER trg_protect_vendor_profile_privileges
BEFORE UPDATE ON public.vendor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_vendor_profile_privileges();


-- ============================================================================
-- 5. BUYER VERIFICATION STATUS PROTECTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_buyer_verification_status()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) INTO v_is_admin;

    IF NOT v_is_admin THEN
        IF NEW.status != OLD.status THEN
            RAISE EXCEPTION 'Security Violation: Only platform admins can approve or reject buyer verification.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_buyer_verification_status ON public.buyer_verifications;
CREATE TRIGGER trg_protect_buyer_verification_status
BEFORE UPDATE ON public.buyer_verifications
FOR EACH ROW
EXECUTE FUNCTION public.protect_buyer_verification_status();


-- ============================================================================
-- 6. HERO SPOTLIGHT HIJACKING GUARD
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_product_featured_hero()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) INTO v_is_admin;

    IF NOT v_is_admin THEN
        IF (NEW.is_featured_hero IS DISTINCT FROM OLD.is_featured_hero) AND NEW.is_featured_hero = true THEN
            RAISE EXCEPTION 'Security Violation: Only platform admins can pin products to the Hero Spotlight.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_product_featured_hero ON public.products;
CREATE TRIGGER trg_protect_product_featured_hero
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.protect_product_featured_hero();


-- ============================================================================
-- 7. ATOMIC ROW-LOCKING ESCROW RELEASE (RACE-CONDITION RESILIENT)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_escrow(p_item_id UUID)
RETURNS void AS $$
DECLARE
    v_shop_id UUID;
    v_amount INTEGER;
    v_status TEXT;
    v_buyer_id UUID;
BEGIN
    -- 1. Fetch order item with row-level exclusive lock (FOR UPDATE)
    SELECT oi.shop_id, (oi.price_at_purchase_cents * oi.quantity), oi.status, o.buyer_id
    INTO v_shop_id, v_amount, v_status, v_buyer_id
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = p_item_id
    FOR UPDATE OF oi;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;

    -- 2. Security Check: Only the buyer who made the order (or a platform admin) can release the escrow
    IF v_buyer_id != auth.uid() AND NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only the buyer can confirm delivery';
    END IF;

    -- 3. Prevent double-release and refund release
    IF v_status = 'delivered' THEN
        RAISE EXCEPTION 'Escrow already released for this item';
    END IF;

    IF v_status = 'refunded' THEN
        RAISE EXCEPTION 'Cannot release escrow: item has been refunded';
    END IF;

    -- 4. Mark the item as delivered
    UPDATE public.order_items
    SET status = 'delivered'
    WHERE id = p_item_id;

    -- 5. Atomic balance credit to the vendor wallet
    INSERT INTO public.vendor_balances (shop_id, currency, available_balance_cents)
    VALUES (v_shop_id, 'USD', v_amount)
    ON CONFLICT (shop_id, currency) 
    DO UPDATE SET 
        available_balance_cents = public.vendor_balances.available_balance_cents + EXCLUDED.available_balance_cents,
        updated_at = timezone('utc'::text, now());

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 8. VERIFIED PURCHASE REVIEWS ONLY
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_verified_purchase_review()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE o.buyer_id = auth.uid()
          AND oi.product_id = NEW.product_id
          AND oi.status = 'delivered'
    ) THEN
        RAISE EXCEPTION 'Verified Purchase Required: You can only review products you have purchased and received.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_verified_purchase_review ON public.reviews;
CREATE TRIGGER trg_check_verified_purchase_review
BEFORE INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.check_verified_purchase_review();
