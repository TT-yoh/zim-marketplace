-- 20231010000025_security_hardening_and_payouts.sql
-- Financial & Identity Security Hardening:
-- 1. Hardens kyc-documents bucket from public to private with authenticated RLS.
-- 2. Creates payout_requests table and secure double-entry payout lifecycle.
-- 3. Atomic stored procedures: request_vendor_payout and admin_process_payout.
-- 4. Locks down direct client-side balance mutations on vendor_balances.

-- ============================================================================
-- 1. HARDEN KYC STORAGE BUCKET (MAKE PRIVATE & ENFORCE RLS)
-- ============================================================================
-- Ensure kyc-documents is private (prevent direct unauthorized file downloads)
UPDATE storage.buckets
SET public = false
WHERE id = 'kyc-documents';

-- Drop any lingering public read/upload policies on kyc-documents
DROP POLICY IF EXISTS "Public Read Access kyc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload kyc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update kyc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;

-- Authenticated vendors can upload into their own folder: <userId>/...
CREATE POLICY "Vendors can upload own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Only the document owner OR a platform admin can read/view KYC documents
CREATE POLICY "Owners and Admins can read KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    )
);

-- Owners and Admins can delete KYC documents if needed
CREATE POLICY "Owners and Admins can delete KYC documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'kyc-documents' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
    )
);


-- ============================================================================
-- 2. PAYOUT REQUESTS TABLE & LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    payout_method TEXT DEFAULT 'ecocash' NOT NULL,
    payout_details JSONB DEFAULT '{}'::jsonb NOT NULL,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_payout_requests_shop ON public.payout_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created ON public.payout_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Payout Policies
DROP POLICY IF EXISTS "Vendors can view own payout requests" ON public.payout_requests;
CREATE POLICY "Vendors can view own payout requests"
ON public.payout_requests FOR SELECT
TO authenticated
USING (
    shop_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update payout requests" ON public.payout_requests;
CREATE POLICY "Admins can update payout requests"
ON public.payout_requests FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
);


-- ============================================================================
-- 3. SECURE STORED PROCEDURES (RPCS)
-- ============================================================================

-- Function 1: Vendor Requests Payout (Atomic Deduction + Ledger Creation)
CREATE OR REPLACE FUNCTION public.request_vendor_payout(
    p_amount_cents INTEGER,
    p_payout_method TEXT DEFAULT 'ecocash',
    p_payout_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vendor_id UUID := auth.uid();
    v_available_cents INTEGER;
    v_is_verified BOOLEAN;
    v_is_active BOOLEAN;
    v_payout_id UUID;
BEGIN
    -- Check authentication
    IF v_vendor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Validate amount
    IF p_amount_cents <= 0 THEN
        RAISE EXCEPTION 'Payout amount must be greater than zero.';
    END IF;

    -- Check vendor verification and active status
    SELECT is_verified, COALESCE(is_active, true)
    INTO v_is_verified, v_is_active
    FROM public.vendor_profiles
    WHERE id = v_vendor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vendor profile not found.';
    END IF;

    IF NOT v_is_verified THEN
        RAISE EXCEPTION 'Store must be verified (KYC approved) before requesting payouts.';
    END IF;

    IF NOT v_is_active THEN
        RAISE EXCEPTION 'Store is suspended. Cannot request payouts.';
    END IF;

    -- Lock balance row for update to prevent race conditions
    SELECT available_balance_cents
    INTO v_available_cents
    FROM public.vendor_balances
    WHERE shop_id = v_vendor_id AND currency = 'USD'
    FOR UPDATE;

    IF v_available_cents IS NULL OR v_available_cents < p_amount_cents THEN
        RAISE EXCEPTION 'Insufficient available balance. Available: % cents, Requested: % cents', 
            COALESCE(v_available_cents, 0), p_amount_cents;
    END IF;

    -- 1. Deduct requested amount from available balance
    UPDATE public.vendor_balances
    SET available_balance_cents = available_balance_cents - p_amount_cents,
        updated_at = timezone('utc'::text, now())
    WHERE shop_id = v_vendor_id AND currency = 'USD';

    -- 2. Create pending payout request record
    INSERT INTO public.payout_requests (
        shop_id,
        amount_cents,
        currency,
        status,
        payout_method,
        payout_details,
        created_at
    ) VALUES (
        v_vendor_id,
        p_amount_cents,
        'USD',
        'pending',
        COALESCE(p_payout_method, 'ecocash'),
        COALESCE(p_payout_details, '{}'::jsonb),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_payout_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'amount_cents', p_amount_cents,
        'remaining_balance_cents', v_available_cents - p_amount_cents
    );
END;
$$;


-- Function 2: Admin Processes Payout (Approve / Mark Paid / Reject with Auto-Refund)
CREATE OR REPLACE FUNCTION public.admin_process_payout(
    p_payout_id UUID,
    p_new_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
BEGIN
    -- Check admin authorization
    IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: caller is not a platform admin.';
    END IF;

    -- Validate target status
    IF p_new_status NOT IN ('approved', 'paid', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be approved, paid, or rejected.';
    END IF;

    -- Fetch payout record with row lock
    SELECT * INTO v_req
    FROM public.payout_requests
    WHERE id = p_payout_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payout request not found.';
    END IF;

    IF v_req.status = 'paid' THEN
        RAISE EXCEPTION 'Cannot modify a payout that has already been marked as paid.';
    END IF;

    IF v_req.status = 'rejected' THEN
        RAISE EXCEPTION 'Cannot modify a payout that has already been rejected.';
    END IF;

    -- If rejected, atomically refund funds back to the vendor balance
    IF p_new_status = 'rejected' THEN
        UPDATE public.vendor_balances
        SET available_balance_cents = available_balance_cents + v_req.amount_cents,
            updated_at = timezone('utc'::text, now())
        WHERE shop_id = v_req.shop_id AND currency = v_req.currency;
    END IF;

    -- Update payout request record
    UPDATE public.payout_requests
    SET status = p_new_status,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        processed_at = timezone('utc'::text, now())
    WHERE id = p_payout_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', p_payout_id,
        'status', p_new_status,
        'amount_cents', v_req.amount_cents
    );
END;
$$;


-- ============================================================================
-- 4. LOCK DOWN DIRECT CLIENT-SIDE UPDATES TO VENDOR_BALANCES
-- ============================================================================
-- Vendors must NOT be able to run arbitrary direct UPDATE queries on vendor_balances.
-- All modifications must flow through release_escrow or request_vendor_payout.
DROP POLICY IF EXISTS "Vendors and Admins can update balances" ON public.vendor_balances;

-- Only platform admins can directly update vendor_balances if needed
CREATE POLICY "Admins only can directly update balances"
ON public.vendor_balances FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
);

-- Vendors can still view their own balance
DROP POLICY IF EXISTS "Vendors and Admins can view balances" ON public.vendor_balances;
CREATE POLICY "Vendors and Admins can view balances"
ON public.vendor_balances FOR SELECT
TO authenticated
USING (
    shop_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
);
