# ChainDraw — How to Use

## Organizer Guide — Create → Commit → Draw → Pay

**1. Connect wallet**
- Connect Phantom or Solflare
- This wallet becomes the campaign's organizer identity — all privileged actions later require signing a proof with this same key

**2. Create the campaign**
- Paste the social post URL you want engagement on (Mastodon, Farcaster, and more platforms over time)
- Set the prize token + total amount, and the number of winners
- Choose the ending trigger — pick one:
  - **Time-based:** the campaign closes automatically at a set cutoff date/time
  - **Response-based:** the campaign closes automatically the moment a target entry count is reached (e.g., "close after 500 valid entries")
- Choose required actions: favourite, boost/repost, follow
- Campaign is saved as a draft — not yet visible to entrants

**3. Commit the prize**
- ChainDraw generates a dedicated wallet for the campaign — a program-controlled address that no one, including the organizer, holds a private key to
- This wallet address is public from the moment the campaign is created — anyone can look it up on an explorer
- Transfer the full prize amount into that wallet as a real, verifiable on-chain deposit
- The campaign only goes live once that deposit is confirmed on-chain
- Anyone can independently check the wallet's balance and see the prize is genuinely funded, before a single entry exists

**4. Campaign goes live**
- Now visible in the public event listing
- Participants can discover it, sign in, complete actions, and enter

**5. Monitor entries**
- The organizer dashboard shows live entrant count and the verification log (which actions each entrant passed)
- No action needed here — verification happens automatically per entrant

**6. Campaign closes automatically**
- Time-based campaigns stop accepting entries at the cutoff
- Response-based campaigns stop the moment the target entry count is reached — first-come, capped-response
- Either way, closing is a rule the system enforces, not something the organizer decides in the moment

**7. Trigger the draw**
- Sign a request to run the draw
- A random seed is generated and published, and a deterministic shuffle over the entry list picks the winners
- The published seed means anyone can independently recompute the shuffle and verify the result themselves

**8. Review winners**
- The dashboard shows the winner list, each with an entry index that's checkable against the published seed

**9. Pay winners**
- Sign the payout — funds move directly from the campaign's dedicated wallet to each winner's wallet
- Each payout's transaction signature is stored and shown publicly next to the winner's entry
- There is no separate "claim" step — the payout itself is the notification

## Participant Guide — Discover → Enter → Win

**1. Discover a campaign**
- Find it on the public ChainDraw event listing, or via the organizer's own social post

**2. Sign in with your platform identity**
- Sign in with the relevant platform (Mastodon instance login, Sign In With Farcaster, and more over time)
- Your handle/instance comes from the platform's own login — never typed in by you, so it can't be spoofed

**3. Set your payout wallet**
- Enter your Solana wallet address, or let it auto-fill from your profile where supported (e.g. Farcaster pulls your verified Solana address automatically)

**4. Complete the required actions**
- Actually favourite/boost/follow on the real platform — this gets checked, not just assumed

**5. Hit "Enter"**
- ChainDraw checks each required action against the platform's own API in real time
- **Pending state:** "issuing your ticket" — the entry button disables, your transaction is submitted but not yet confirmed
- **Success state:** "you're in the draw" — shown only after on-chain confirmation, with a transaction signature linked to an explorer so you can verify it yourself
- Trying to enter twice with the same wallet or handle fails outright

**6. Wait for the draw**
- Nothing to do. Once the campaign closes, the draw runs and the random seed used is published

**7. Verify the draw yourself**
- Take the published seed, run the same shuffle logic, and confirm the winner list matches — you don't have to take the organizer's word for it

**8. If you win: get paid automatically**
- The prize lands directly in your wallet from the campaign's dedicated wallet — no claim link, no message asking for a seed phrase, nothing to click
- The payout transaction signature is public — check it on an explorer to confirm you actually received it
