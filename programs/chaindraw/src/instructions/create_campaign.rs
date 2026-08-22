use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::{MAX_WINNERS, SEED_CAMPAIGN};
use crate::error::ChaindrawError;
use crate::state::{Campaign, CampaignState, EndingTrigger};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = authority,
        space = Campaign::SPACE,
        seeds = [SEED_CAMPAIGN, authority.key().as_ref(), &campaign_id.to_le_bytes()],
        bump,
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_campaign_handler(
    ctx: Context<CreateCampaign>,
    campaign_id: u64,
    verifier: Pubkey,
    prize_amount: u64,
    start_time: i64,
    ending_trigger: EndingTrigger,
    num_winners: u8,
) -> Result<()> {
    match ending_trigger {
        EndingTrigger::Time { end_time } => {
            require!(end_time > start_time, ChaindrawError::InvalidTimeRange);
        }
        EndingTrigger::ResponseCount { target_entry_count } => {
            require!(
                target_entry_count >= 1,
                ChaindrawError::InvalidTargetEntryCount
            );
        }
    }
    require!(
        num_winners >= 1 && num_winners <= MAX_WINNERS,
        ChaindrawError::InvalidWinnerCount
    );

    let campaign = &mut ctx.accounts.campaign;
    campaign.authority = ctx.accounts.authority.key();
    campaign.verifier = verifier;
    campaign.campaign_id = campaign_id;
    campaign.prize_amount = prize_amount;
    campaign.start_time = start_time;
    campaign.ending_trigger = ending_trigger;
    campaign.entry_count = 0;
    campaign.num_winners = num_winners;
    campaign.state = CampaignState::Open;
    campaign.randomness_target_slot = 0;
    campaign.winner_indices = [0u32; MAX_WINNERS as usize];
    campaign.winners_drawn = 0;
    campaign.bump = ctx.bumps.campaign;

    // Prize pool is locked into the campaign PDA itself (no separate vault
    // account for SOL, v1 is SOL-only) — this is the "Solana Fixed
    // Delegation" lock the product's copy refers to.
    if prize_amount > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: campaign.to_account_info(),
                },
            ),
            prize_amount,
        )?;
    }

    Ok(())
}
