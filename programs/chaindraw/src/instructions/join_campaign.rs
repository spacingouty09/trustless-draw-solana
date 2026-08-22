use anchor_lang::prelude::*;

use crate::constants::{SEED_CAMPAIGN, SEED_ENTRY};
use crate::error::ChaindrawError;
use crate::state::{Campaign, CampaignState, EndingTrigger, Entry};

#[derive(Accounts)]
pub struct JoinCampaign<'info> {
    #[account(
        mut,
        seeds = [SEED_CAMPAIGN, campaign.authority.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump,
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    // The `init` constraint is the duplicate-entry guard: a second join from
    // the same wallet tries to create an account that already exists at this
    // deterministic PDA and fails outright, enforced by the runtime itself.
    #[account(
        init,
        payer = verifier,
        space = Entry::SPACE,
        seeds = [SEED_ENTRY, campaign.key().as_ref(), participant.key().as_ref()],
        bump,
    )]
    pub entry: Account<'info, Entry>,

    /// Backend verifier — attests the off-chain platform-action check
    /// passed. Must match `campaign.verifier`; also the tx fee payer, which
    /// is what keeps this gasless for the participant.
    #[account(mut, address = campaign.verifier @ ChaindrawError::InvalidVerifier)]
    pub verifier: Signer<'info>,

    /// Participant — signs to consent to entering with this specific wallet
    /// (the prize auto-transfers here later). Pays no fees.
    pub participant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn join_campaign_handler(ctx: Context<JoinCampaign>, verification_hash: [u8; 32]) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Open,
        ChaindrawError::CampaignNotOpen
    );
    match campaign.ending_trigger {
        EndingTrigger::Time { end_time } => {
            require!(
                Clock::get()?.unix_timestamp < end_time,
                ChaindrawError::EndingTriggerReached
            );
        }
        EndingTrigger::ResponseCount { target_entry_count } => {
            // This guard *is* the cutoff for response-based campaigns: the
            // join that brings entry_count to target_entry_count succeeds,
            // the next one fails here — no separate "close" step needed.
            require!(
                campaign.entry_count < target_entry_count,
                ChaindrawError::EndingTriggerReached
            );
        }
    }

    let entry = &mut ctx.accounts.entry;
    entry.participant = ctx.accounts.participant.key();
    entry.campaign = campaign.key();
    entry.entry_index = campaign.entry_count;
    entry.verification_hash = verification_hash;
    entry.joined_at = Clock::get()?.unix_timestamp;
    entry.claimed = false;
    entry.bump = ctx.bumps.entry;

    campaign.entry_count = campaign
        .entry_count
        .checked_add(1)
        .ok_or(ChaindrawError::EntryCountOverflow)?;

    Ok(())
}
