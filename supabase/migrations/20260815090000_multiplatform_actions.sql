-- Multi-platform actions model ("web3 Gleam"): a campaign owns a checklist of
-- platform actions; each participant completion is verified and recorded
-- independently. Mastodon-specific event columns become optional legacy fields;
-- existing events are backfilled into campaign_actions so verification has a
-- single actions-driven code path.

CREATE TABLE public.campaign_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,                          -- 'mastodon' | 'farcaster' | 'bluesky' | ...
  action_type TEXT NOT NULL,                       -- 'like' | 'repost' | 'follow' | 'comment_code' | 'post_tag'
  target_url TEXT,                                 -- human-facing link (post URL, cast URL, profile URL)
  target_ref JSONB NOT NULL DEFAULT '{}'::jsonb,   -- platform refs (instance/status_id/acct or cast_hash/author_fid ...)
  label TEXT NOT NULL DEFAULT '',
  required BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX campaign_actions_event_idx ON public.campaign_actions(event_id);

GRANT SELECT ON public.campaign_actions TO anon;
GRANT SELECT ON public.campaign_actions TO authenticated;
GRANT ALL ON public.campaign_actions TO service_role;
ALTER TABLE public.campaign_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaign actions are publicly readable" ON public.campaign_actions FOR SELECT USING (true);

CREATE TABLE public.action_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.campaign_actions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES public.entries(id) ON DELETE CASCADE,
  platform_identity TEXT NOT NULL,                 -- 'mastodon:user@instance' | 'farcaster:12345'
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  proof JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (action_id, platform_identity)
);

CREATE INDEX action_completions_event_idx ON public.action_completions(event_id);

GRANT SELECT ON public.action_completions TO anon;
GRANT SELECT ON public.action_completions TO authenticated;
GRANT ALL ON public.action_completions TO service_role;
ALTER TABLE public.action_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Action completions are publicly readable" ON public.action_completions FOR SELECT USING (true);

-- Events become platform-agnostic: Mastodon columns turn optional (legacy).
ALTER TABLE public.events ALTER COLUMN mastodon_status_url DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN mastodon_instance DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN mastodon_status_id DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN mastodon_account_acct DROP NOT NULL;

-- Entries: linked platform identities for multi-platform campaigns.
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS identities JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill existing events into the actions model.
INSERT INTO public.campaign_actions (event_id, platform, action_type, target_url, target_ref, label, required, sort)
SELECT id, 'mastodon', 'like', mastodon_status_url,
       jsonb_build_object('instance', mastodon_instance, 'status_id', mastodon_status_id, 'status_url', mastodon_status_url),
       'Favourite the post', true, 0
FROM public.events WHERE require_favourite AND mastodon_status_url IS NOT NULL;

INSERT INTO public.campaign_actions (event_id, platform, action_type, target_url, target_ref, label, required, sort)
SELECT id, 'mastodon', 'repost', mastodon_status_url,
       jsonb_build_object('instance', mastodon_instance, 'status_id', mastodon_status_id, 'status_url', mastodon_status_url),
       'Boost the post', true, 1
FROM public.events WHERE require_boost AND mastodon_status_url IS NOT NULL;

INSERT INTO public.campaign_actions (event_id, platform, action_type, target_url, target_ref, label, required, sort)
SELECT id, 'mastodon', 'follow',
       'https://' || mastodon_instance || '/@' || mastodon_account_acct,
       jsonb_build_object('instance', mastodon_instance, 'account_id', mastodon_account_id, 'acct', mastodon_account_acct),
       'Follow @' || mastodon_account_acct, true, 2
FROM public.events WHERE require_follow AND mastodon_instance IS NOT NULL;
