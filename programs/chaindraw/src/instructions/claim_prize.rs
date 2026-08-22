use anchor_lang::prelude::*;

use crate::constants::{SEED_CAMPAIGN, SEED_ENTRY};
use crate::error::ChaindrawError;
use crate::state::{Campaign, CampaignState, Entry};

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(
        mut,
        seeds = [SEED_CAMPAIGN, campaign.authority.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump,
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    #[account(
        mut,
        seeds = [SEED_ENTRY, campaign.key().as_ref(), entry.participant.as_ref()],
        bump = entry.bump,
    )]
    pub entry: Account<'info, Entry>,

    /// CHECK: payout destination, constrained to equal `entry.participant`
    /// below — the whole point is that anyone can crank this, but funds can
    /// only ever land on the wallet that actually won.
    #[account(mut, address = entry.participant)]
    pub participant: UncheckedAccount<'info>,

    /// Permissionless crank — anyone may trigger payout to a legitimate
    /// winner; no ownership check on this account.
    #[account(mut)]
    pub caller: Signer<'info>,
}

pub fn claim_prize_handler(ctx: Context<ClaimPrize>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    let entry = &mut ctx.accounts.entry;

    require!(
        campaign.state == CampaignState::Completed,
        ChaindrawError::DrawNotCompleted
    );
    require_keys_eq!(
        entry.campaign,
        campaign.key(),
        ChaindrawError::EntryCampaignMismatch
    );
    require!(!entry.claimed, ChaindrawError::AlreadyClaimed);

    let winners = &campaign.winner_indices[0..campaign.winners_drawn as usize];
    require!(
        winners.contains(&entry.entry_index),
        ChaindrawError::NotAWinningEntry
    );

    // Vault is the campaign PDA itself; we own it, so a direct lamport
    // debit is legal without a signed CPI transfer. Any per-winner
    // remainder from integer division stays in the vault.
    let per_winner = campaign.prize_amount / campaign.num_winners as u64;
    **campaign.to_account_info().try_borrow_mut_lamports()? -= per_winner;
    **ctx.accounts.participant.to_account_info().try_borrow_mut_lamports()? += per_winner;

    entry.claimed = true;

    Ok(())
}
