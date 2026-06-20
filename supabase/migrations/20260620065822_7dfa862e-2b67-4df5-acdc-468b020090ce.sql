
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_pubkey TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mastodon_status_url TEXT NOT NULL,
  mastodon_instance TEXT NOT NULL,
  mastodon_status_id TEXT NOT NULL,
  mastodon_account_acct TEXT NOT NULL,
  mastodon_account_id TEXT,
  require_favourite BOOLEAN NOT NULL DEFAULT true,
  require_boost BOOLEAN NOT NULL DEFAULT false,
  require_follow BOOLEAN NOT NULL DEFAULT false,
  prize_token TEXT NOT NULL DEFAULT 'USDC',
  prize_total NUMERIC NOT NULL,
  num_winners INTEGER NOT NULL DEFAULT 1,
  cutoff_ts TIMESTAMPTZ NOT NULL,
  commit_tx TEXT,
  delegation_pda TEXT,
  draw_seed TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are publicly readable" ON public.events FOR SELECT USING (true);

CREATE TABLE public.entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  handle_hash TEXT NOT NULL,
  wallet TEXT NOT NULL,
  index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, handle_hash)
);

CREATE INDEX entries_event_idx ON public.entries(event_id);

GRANT SELECT ON public.entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO authenticated;
GRANT ALL ON public.entries TO service_role;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entries are publicly readable" ON public.entries FOR SELECT USING (true);

CREATE TABLE public.verification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  result TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verification_log TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_log TO authenticated;
GRANT ALL ON public.verification_log TO service_role;
ALTER TABLE public.verification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verification logs are publicly readable" ON public.verification_log FOR SELECT USING (true);

CREATE TABLE public.winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  share NUMERIC NOT NULL,
  payout_tx TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX winners_event_idx ON public.winners(event_id);

GRANT SELECT ON public.winners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winners TO authenticated;
GRANT ALL ON public.winners TO service_role;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Winners are publicly readable" ON public.winners FOR SELECT USING (true);
