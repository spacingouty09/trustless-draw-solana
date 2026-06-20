CREATE POLICY "Deny all client access" ON public.mastodon_oauth_apps
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);