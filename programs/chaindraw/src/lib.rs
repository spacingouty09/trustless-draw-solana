use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("mVfGuxEb9jWRWpf2n7wzRmEESqdvCWaBx9zQCALuJWz");

#[program]
pub mod chaindraw {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        verifier: Pubkey,
        prize_amount: u64,
        start_time: i64,
        ending_trigger: state::EndingTrigger,
        num_winners: u8,
    ) -> Result<()> {
        instructions::create_campaign::create_campaign_handler(
            ctx,
            campaign_id,
            verifier,
            prize_amount,
            start_time,
            ending_trigger,
            num_winners,
        )
    }

    pub fn join_campaign(ctx: Context<JoinCampaign>, verification_hash: [u8; 32]) -> Result<()> {
        instructions::join_campaign::join_campaign_handler(ctx, verification_hash)
    }

    pub fn request_draw(ctx: Context<RequestDraw>) -> Result<()> {
        instructions::request_draw::request_draw_handler(ctx)
    }

    pub fn resolve_draw(ctx: Context<ResolveDraw>) -> Result<()> {
        instructions::resolve_draw::resolve_draw_handler(ctx)
    }

    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize::claim_prize_handler(ctx)
    }
}
