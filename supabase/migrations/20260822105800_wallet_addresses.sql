-- Donation addresses for the Support page. A file-based (.walletaddress)
-- approach was tried first but Vercel's serverless file tracer doesn't
-- reliably bundle files that aren't referenced via a statically-analyzable
-- literal path -- confirmed empirically (two preview deploys, ENOENT both
-- times). A table matches every other piece of dynamic data in this app and
-- is editable via the Supabase dashboard's table editor (no SQL needed) or
-- by asking Claude to update a row.
CREATE TABLE public.wallet_addresses (
  network TEXT PRIMARY KEY,
  address TEXT NOT NULL DEFAULT ''
);
GRANT SELECT ON public.wallet_addresses TO anon;
GRANT SELECT ON public.wallet_addresses TO authenticated;
GRANT ALL ON public.wallet_addresses TO service_role;
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wallet addresses are publicly readable" ON public.wallet_addresses FOR SELECT USING (true);

INSERT INTO public.wallet_addresses (network) VALUES
  ('SOLANA'), ('ETHEREUM'), ('BITCOIN_TAPROOT'), ('BITCOIN_NATIVE_SEGWIT'),
  ('ROBINHOOD_CHAIN'), ('MONAD'), ('BASE'), ('SUI'), ('POLYGON'), ('HYPEREVM');
