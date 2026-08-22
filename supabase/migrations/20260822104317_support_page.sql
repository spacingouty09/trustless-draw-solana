-- Support page: email signups and product feedback. Both are anonymous
-- public-form submissions holding user-supplied contact info, so — like
-- verification_log and mastodon_oauth_apps — they're service-role only,
-- no public SELECT policy.

CREATE TABLE public.interest_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.interest_signups TO service_role;
ALTER TABLE public.interest_signups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  emailed_at TIMESTAMPTZ,
  email_error TEXT
);
GRANT ALL ON public.product_suggestions TO service_role;
ALTER TABLE public.product_suggestions ENABLE ROW LEVEL SECURITY;
