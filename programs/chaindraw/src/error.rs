use anchor_lang::prelude::*;

#[error_code]
pub enum ChaindrawError {
    #[msg("Campaign is not open")]
    CampaignNotOpen,
    #[msg("Campaign's ending trigger has already been met")]
    EndingTriggerReached,
    #[msg("Campaign's ending trigger has not been met yet")]
    EndingTriggerNotMet,
    #[msg("Signer is not the campaign's authorized verifier")]
    InvalidVerifier,
    #[msg("num_winners must be between 1 and MAX_WINNERS")]
    InvalidWinnerCount,
    #[msg("end_time must be after start_time")]
    InvalidTimeRange,
    #[msg("target_entry_count must be at least 1")]
    InvalidTargetEntryCount,
    #[msg("Campaign has no entries to draw from")]
    NoEntries,
    #[msg("Entry count overflow")]
    EntryCountOverflow,
    #[msg("entry_count must be at least num_winners before a draw can be requested")]
    NotEnoughEntries,
    #[msg("A draw has already been requested or completed for this campaign")]
    DrawAlreadyRequested,
    #[msg("No draw has been requested for this campaign yet")]
    NotAwaitingDraw,
    #[msg("The committed randomness slot hasn't passed yet — retry shortly")]
    RandomnessSlotNotReachedYet,
    #[msg("The committed randomness slot fell out of the SlotHashes window before being resolved")]
    RandomnessSlotExpired,
    #[msg("The SlotHashes sysvar account is malformed")]
    MalformedSlotHashes,
    #[msg("The draw has not completed yet")]
    DrawNotCompleted,
    #[msg("This entry does not belong to the given campaign")]
    EntryCampaignMismatch,
    #[msg("This entry did not win")]
    NotAWinningEntry,
    #[msg("This entry's prize has already been claimed")]
    AlreadyClaimed,
}
