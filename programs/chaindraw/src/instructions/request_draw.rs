use anchor_lang::prelude::*;

use crate::constants::{DRAW_DELAY_SLOTS, SEED_CAMPAIGN};
use crate::error::ChaindrawError;
use crate::state::{Campaign, CampaignState, EndingTrigger};

#[derive(Accounts)]
pub struct RequestDraw<'info> {
    #[account(
        mut,
        seeds = [SEED_CAMPAIGN, campaign.authority.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump,
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    /// Permissionless crank — anyone may trigger the draw request once the
    /// campaign's ending trigger is met; no ownership check on this account.
    pub caller: Signer<'info>,
}

pub fn request_draw_handler(ctx: Context<RequestDraw>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Open,
        ChaindrawError::DrawAlreadyRequested
    );
    match campaign.ending_trigger {
        EndingTrigger::Time { end_time } => {
            require!(
                Clock::get()?.unix_timestamp >= end_time,
                ChaindrawError::EndingTriggerNotMet
            );
        }
        EndingTrigger::ResponseCount { target_entry_count } => {
            require!(
                campaign.entry_count >= target_entry_count,
                ChaindrawError::EndingTriggerNotMet
            );
        }
    }
    require!(campaign.entry_count > 0, ChaindrawError::NoEntries);
    require!(
        campaign.entry_count >= campaign.num_winners as u32,
        ChaindrawError::NotEnoughEntries
    );

    // Commit to a future slot now, before its hash exists anywhere —
    // resolve_draw reads it back once it does. Nobody, including this
    // campaign's own authority, can know that hash at commit time.
    campaign.randomness_target_slot = Clock::get()?.slot + DRAW_DELAY_SLOTS;
    campaign.state = CampaignState::Drawing;

    Ok(())
}
