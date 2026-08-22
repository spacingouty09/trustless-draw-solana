pub const SEED_CAMPAIGN: &[u8] = b"campaign";
pub const SEED_ENTRY: &[u8] = b"entry";

/// Matches the existing Postgres schema's num_winners cap (events table) —
/// keeps the N-winner draw's collision-rejection scan bounded and cheap.
pub const MAX_WINNERS: u8 = 50;

/// How many slots ahead `request_draw` commits to. The draw uses the
/// blockhash of this future slot (read from the SlotHashes sysvar once it
/// passes) as its randomness source — unknown to anyone, including the
/// campaign's own authority, at request time. ~40 slots is roughly
/// 15-20 seconds on Solana, long enough that the slot can't be predicted
/// when committed, short enough for a live demo not to feel stalled.
pub const DRAW_DELAY_SLOTS: u64 = 40;

/// Well-known address of the SlotHashes sysvar.
pub const SLOT_HASHES_SYSVAR_ID: &str = "SysvarS1otHashes111111111111111111111111111";
