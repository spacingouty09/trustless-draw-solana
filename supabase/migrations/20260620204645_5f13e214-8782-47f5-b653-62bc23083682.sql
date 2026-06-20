CREATE TABLE public.mastodon_oauth_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance text NOT NULL,
  redirect_uri text NOT NULL,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance, redirect_uri)
);
GRANT ALL ON public.mastodon_oauth_apps TO service_role;
ALTER TABLE public.mastodon_oauth_apps ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (which bypasses RLS) accesses this table.