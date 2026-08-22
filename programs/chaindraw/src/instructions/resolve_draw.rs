use std::str::FromStr;

use anchor_lang::prelude::*;

use crate::constants::{SEED_CAMPAIGN, SLOT_HASHES_SYSVAR_ID};
use crate::error::ChaindrawError;
use crate::state::{Campaign, CampaignState};

#[derive(Accounts)]
pub struct ResolveDraw<'info> {
    #[account(
        mut,
        seeds = [SEED_CAMPAIGN, campaign.authority.as_ref(), &campaign.campaign_id.to_le_bytes()],
        bump = campaign.bump,
    )]
    pub campaign: Box<Account<'info, Campaign>>,

    /// CHECK: the SlotHashes sysvar — address checked in the handler below;
    /// parsed manually against Solana's stable, version-independent sysvar
    /// wire format (an 8-byte little-endian entry count followed by that
    /// many (8-byte slot, 32-byte hash) pairs, sorted descending by slot).
    pub slot_hashes: UncheckedAccount<'info>,
}

pub fn resolve_draw_handler(ctx: Context<ResolveDraw>) -> Result<()> {
    let expected_sysvar = Pubkey::from_str(SLOT_HASHES_SYSVAR_ID).unwrap();
    require_keys_eq!(
        ctx.accounts.slot_hashes.key(),
        expected_sysvar,
        ChaindrawError::MalformedSlotHashes
    );

    let campaign = &mut ctx.accounts.campaign;
    require!(
        campaign.state == CampaignState::Drawing,
        ChaindrawError::NotAwaitingDraw
    );
    require!(
        Clock::get()?.slot > campaign.randomness_target_slot,
        ChaindrawError::RandomnessSlotNotReachedYet
    );

    let slot_hashes_info = ctx.accounts.slot_hashes.to_account_info();
    let data = slot_hashes_info.data.borrow();
    let randomness = find_slot_hash(&data, campaign.randomness_target_slot)
        .ok_or(ChaindrawError::RandomnessSlotExpired)?;
    drop(data);

    // Expand the single randomness value into num_winners distinct entry
    // indices: hash(randomness, i) mod entry_count, reject-and-retry on
    // collision. Cheap since num_winners is capped at MAX_WINNERS (50) — a
    // bounded linear scan against the already-picked set, not something
    // that scales with entry_count.
    let num_winners = campaign.num_winners as usize;
    let entry_count = campaign.entry_count;
    let mut picked: Vec<u32> = Vec::with_capacity(num_winners);
    let mut i: u32 = 0;
    while picked.len() < num_winners {
        let h = solana_sha256_hasher::hashv(&[&randomness[..], &i.to_le_bytes()]);
        let h_bytes: &[u8] = h.as_ref();
        let candidate = u32::from_le_bytes(h_bytes[0..4].try_into().unwrap()) % entry_count;
        if !picked.contains(&candidate) {
            picked.push(candidate);
        }
        i = i.checked_add(1).ok_or(ChaindrawError::EntryCountOverflow)?;
    }

    for (slot, idx) in picked.iter().enumerate() {
        campaign.winner_indices[slot] = *idx;
    }
    campaign.winners_drawn = num_winners as u8;
    campaign.state = CampaignState::Completed;

    Ok(())
}

/// Linear scan over the raw SlotHashes sysvar bytes for `target_slot`'s
/// hash. At most 512 entries — cheap and avoids depending on any crate's
/// (de)serialization of this sysvar, only the stable runtime wire format.
fn find_slot_hash(data: &[u8], target_slot: u64) -> Option<[u8; 32]> {
    if data.len() < 8 {
        return None;
    }
    let num_entries = u64::from_le_bytes(data[0..8].try_into().ok()?) as usize;
    let num_entries = num_entries.min(512);
    for i in 0..num_entries {
        let offset = 8 + i * 40;
        if offset + 40 > data.len() {
            break;
        }
        let slot = u64::from_le_bytes(data[offset..offset + 8].try_into().ok()?);
        if slot == target_slot {
            let mut hash = [0u8; 32];
            hash.copy_from_slice(&data[offset + 8..offset + 40]);
            return Some(hash);
        }
    }
    None
}
