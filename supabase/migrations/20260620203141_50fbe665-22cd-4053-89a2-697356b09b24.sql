DROP POLICY IF EXISTS "Verification logs are publicly readable" ON public.verification_log;
REVOKE SELECT ON public.verification_log FROM anon;
REVOKE SELECT ON public.verification_log FROM authenticated;
GRANT ALL ON public.verification_log TO service_role;