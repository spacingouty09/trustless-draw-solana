DROP POLICY IF EXISTS "Deny all client access" ON public.mastodon_oauth_apps;
CREATE POLICY "No client access" ON public.mastodon_oauth_apps
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);