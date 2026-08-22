use anchor_lang::prelude::*;

use crate::constants::MAX_WINNERS;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CampaignState {
    Open,
    Drawing,
    Completed,
    Cancelled,
}

/// A campaign closes either once a clock time passes, or once a target
/// number of valid entries exists — never both. For the response-based
/// mode, the `entry_count < target_entry_count` guard in `join_campaign`
/// *is* the cutoff: the entry that fills the last slot succeeds, the next
/// attempt fails outright, no separate "close" transaction or organizer
/// discretion involved.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum EndingTrigger {
    Time { end_time: i64 },
    ResponseCount { target_entry_count: u32 },
}

#[account]
pub struct Campaign {
    pub authority: Pubkey,
    pub verifier: Pubkey,
    pub campaign_id: u64,
    pub prize_amount: u64,
    pub start_time: i64,
    pub ending_trigger: EndingTrigger,
    pub entry_count: u32,
    pub num_winners: u8,
    pub state: CampaignState,
    /// The future slot whose SlotHashes entry `resolve_draw` will use as
    /// its randomness source, committed by `request_draw` before that
    /// slot's hash is knowable to anyone (see DRAW_DELAY_SLOTS). 0 until a
    /// draw has been requested.
    pub randomness_target_slot: u64,
    /// Winning `Entry.entry_index` values, valid for `[0, winners_drawn)`.
    /// Indices, not participant pubkeys — the participant's actual wallet
    /// only exists on the Entry account, so `claim_prize` looks it up from
    /// there rather than duplicating it here.
    pub winner_indices: [u32; MAX_WINNERS as usize],
    pub winners_drawn: u8,
    pub bump: u8,
}

impl Campaign {
    pub const SPACE: usize = 8 // discriminator
        + 32 // authority
        + 32 // verifier
        + 8 // campaign_id
        + 8 // prize_amount
        + 8 // start_time
        + 9 // ending_trigger (1 discriminant + 8 for the larger variant, Time { end_time: i64 })
        + 4 // entry_count
        + 1 // num_winners
        + 1 // state
        + 8 // randomness_target_slot
        + 4 * MAX_WINNERS as usize // winner_indices
        + 1 // winners_drawn
        + 1; // bump
}

#[account]
pub struct Entry {
    pub participant: Pubkey,
    pub campaign: Pubkey,
    pub entry_index: u32,
    /// Hash of the off-chain platform-verification result — never the raw
    /// social data (privacy and rent cost).
    pub verification_hash: [u8; 32],
    pub joined_at: i64,
    /// Set once the prize for this entry (if it won) has been paid out —
    /// the guard that makes `claim_prize` idempotent per winning entry.
    pub claimed: bool,
    pub bump: u8,
}

impl Entry {
    pub const SPACE: usize = 8 // discriminator
        + 32 // participant
        + 32 // campaign
        + 4 // entry_index
        + 32 // verification_hash
        + 8 // joined_at
        + 1 // claimed
        + 1; // bump
}
