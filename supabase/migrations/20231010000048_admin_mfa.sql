-- 20231010000048_admin_mfa.sql
-- Two-factor sign-in (TOTP authenticator app) for platform admins.
-- Once an admin has a verified authenticator, their admin powers only work in a session that
-- passed the second factor (JWT aal = 'aal2'). A stolen password alone then gives no admin access.
-- Admins who have not enrolled yet keep working (no lock-out); the app makes them enrol before
-- it opens the admin dashboard.
--
-- Enforced in three places so every path is covered:
--   1. is_platform_admin()                      -> SECURITY DEFINER functions and newer policies
--   2. RLS on platform_admins                   -> the many older policies that do
--                                                  EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid())
--   3. the two trigger functions that read platform_admins directly

-- True when the caller's session satisfies the admin MFA rule
CREATE OR REPLACE FUNCTION public.admin_mfa_ok()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(auth.jwt() ->> 'aal', '') = 'aal2'
        OR NOT EXISTS (
            SELECT 1 FROM auth.mfa_factors f
            WHERE f.user_id = auth.uid() AND f.status = 'verified'
        );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
       AND public.admin_mfa_ok();
$$;

-- 2. platform_admins was readable by everyone (policy "Public Read Admins" USING true), which
--    also leaked who the admins are. Each user can now see only their own row, and only with MFA.
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Admins read own row with MFA" ON public.platform_admins;
CREATE POLICY "Admins read own row with MFA"
ON public.platform_admins FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()) AND (SELECT public.admin_mfa_ok()));
REVOKE ALL ON public.platform_admins FROM anon;

-- 3. Trigger functions that check the caller against platform_admins directly
DO $$
DECLARE
    v_fn TEXT;
    v_def TEXT;
BEGIN
    FOREACH v_fn IN ARRAY ARRAY['protect_buyer_verification_status', 'protect_product_featured_hero'] LOOP
        SELECT pg_get_functiondef(p.oid) INTO v_def
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = v_fn
        LIMIT 1;

        IF v_def IS NOT NULL AND strpos(v_def, 'FROM public.platform_admins WHERE id = auth.uid()') > 0 THEN
            v_def := replace(v_def,
                'SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())',
                'SELECT public.is_platform_admin()');
            EXECUTE v_def;
        END IF;
    END LOOP;
END $$;

-- What the app needs to decide which screen to show an admin (membership is reported even
-- before the second factor, so the app can ask for the code instead of hiding the dashboard).
CREATE OR REPLACE FUNCTION public.get_my_admin_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'is_admin', EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()),
        'mfa_enrolled', EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = auth.uid() AND f.status = 'verified'),
        'aal', COALESCE(auth.jwt() ->> 'aal', 'aal1')
    )
    WHERE auth.uid() IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_mfa_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mfa_ok() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_admin_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_status() TO authenticated;
