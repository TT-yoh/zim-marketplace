-- 20231010000049_client_error_log.sql
-- Browser errors (crashes, failed promises) are reported to this table so admins can see what
-- breaks for real users instead of relying on someone sending a screenshot.
-- Clients can only write through log_client_error(), which trims every field and rate-limits;
-- only admins can read. Rows older than 30 days are pruned.

CREATE TABLE IF NOT EXISTS public.client_errors (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID,
    message TEXT NOT NULL,
    stack TEXT,
    source TEXT,
    url TEXT,
    user_agent TEXT,
    app_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_client_errors_created ON public.client_errors(created_at DESC);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_errors FROM anon, authenticated;
GRANT SELECT, DELETE ON public.client_errors TO authenticated;

DROP POLICY IF EXISTS "Admins read client errors" ON public.client_errors;
CREATE POLICY "Admins read client errors"
ON public.client_errors FOR SELECT TO authenticated
USING ((SELECT public.is_platform_admin()));

DROP POLICY IF EXISTS "Admins delete client errors" ON public.client_errors;
CREATE POLICY "Admins delete client errors"
ON public.client_errors FOR DELETE TO authenticated
USING ((SELECT public.is_platform_admin()));

CREATE OR REPLACE FUNCTION public.log_client_error(
    p_message TEXT,
    p_stack TEXT DEFAULT NULL,
    p_source TEXT DEFAULT NULL,
    p_url TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_app_version TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
        RETURN;
    END IF;

    -- Flood guard: at most 20 reports per signed-in user (or 200 anonymous in total) per minute
    IF auth.uid() IS NOT NULL THEN
        IF (SELECT count(*) FROM public.client_errors
            WHERE user_id = auth.uid() AND created_at > now() - interval '1 minute') >= 20 THEN
            RETURN;
        END IF;
    ELSIF (SELECT count(*) FROM public.client_errors
           WHERE user_id IS NULL AND created_at > now() - interval '1 minute') >= 200 THEN
        RETURN;
    END IF;

    INSERT INTO public.client_errors (user_id, message, stack, source, url, user_agent, app_version)
    VALUES (
        auth.uid(),
        left(p_message, 1000),
        left(p_stack, 4000),
        left(p_source, 50),
        left(p_url, 500),
        left(p_user_agent, 300),
        left(p_app_version, 50)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_client_error(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_client_error(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'prune-old-client-errors',
            '41 3 * * *',
            $cron$DELETE FROM public.client_errors WHERE created_at < now() - interval '30 days'$cron$
        );
    END IF;
END $$;
