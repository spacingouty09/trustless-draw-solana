use std::str::FromStr;

use anchor_lang::{
    prelude::{Clock, Pubkey},
    solana_program::{instruction::Instruction, system_program},
    AccountDeserialize, InstructionData, ToAccountMetas,
};
use chaindraw::state::EndingTrigger;
use litesvm::LiteSVM;
use solana_hash::Hash;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_slot_hashes::SlotHashes;
use solana_transaction::versioned::VersionedTransaction;

const NOW: i64 = 1_800_000_000; // fixed epoch for deterministic time-based guards
const START_SLOT: u64 = 100_000;
const ONE_SOL: u64 = 1_000_000_000;
const SLOT_HASHES_SYSVAR_ID: &str = "SysvarS1otHashes111111111111111111111111111";

fn time_trigger(end_time: i64) -> EndingTrigger {
    EndingTrigger::Time { end_time }
}

fn count_trigger(target_entry_count: u32) -> EndingTrigger {
    EndingTrigger::ResponseCount {
        target_entry_count,
    }
}

fn campaign_pda(authority: &Pubkey, campaign_id: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[
            chaindraw::constants::SEED_CAMPAIGN,
            authority.as_ref(),
            &campaign_id.to_le_bytes(),
        ],
        &chaindraw::id(),
    )
    .0
}

fn entry_pda(campaign: &Pubkey, participant: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            chaindraw::constants::SEED_ENTRY,
            campaign.as_ref(),
            participant.as_ref(),
        ],
        &chaindraw::id(),
    )
    .0
}

fn slot_hashes_id() -> Pubkey {
    Pubkey::from_str(SLOT_HASHES_SYSVAR_ID).unwrap()
}

/// Fresh LiteSVM with the built program loaded, clock pinned to (NOW, START_SLOT).
fn new_svm() -> LiteSVM {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/chaindraw.so"
    ));
    svm.add_program(chaindraw::id(), bytes).unwrap();
    svm.set_sysvar(&Clock {
        slot: START_SLOT,
        epoch_start_timestamp: 0,
        epoch: 0,
        leader_schedule_epoch: 0,
        unix_timestamp: NOW,
    });
    svm
}

fn warp_time(svm: &mut LiteSVM, unix_timestamp: i64) {
    let mut clock: Clock = svm.get_sysvar();
    clock.unix_timestamp = unix_timestamp;
    svm.set_sysvar(&clock);
}

fn warp_slot(svm: &mut LiteSVM, slot: u64) {
    let mut clock: Clock = svm.get_sysvar();
    clock.slot = slot;
    svm.set_sysvar(&clock);
}

/// Publishes a single (slot, hash) entry into the SlotHashes sysvar — the
/// on-chain program only ever looks up one specific slot, so the rest of
/// the real 512-entry list is irrelevant to these tests.
fn publish_slot_hash(svm: &mut LiteSVM, slot: u64, hash_byte: u8) {
    svm.set_sysvar(&SlotHashes::new(&[(slot, Hash::new_from_array([hash_byte; 32]))]));
}

fn send(
    svm: &mut LiteSVM,
    ix: Instruction,
    payer: &Keypair,
    extra_signers: &[&Keypair],
) -> litesvm::types::TransactionResult {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend_from_slice(extra_signers);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers).unwrap();
    svm.send_transaction(tx)
}

fn create_campaign_ix(
    authority: &Keypair,
    campaign: Pubkey,
    campaign_id: u64,
    verifier: Pubkey,
    prize_amount: u64,
    start_time: i64,
    ending_trigger: EndingTrigger,
    num_winners: u8,
) -> Instruction {
    Instruction::new_with_bytes(
        chaindraw::id(),
        &chaindraw::instruction::CreateCampaign {
            campaign_id,
            verifier,
            prize_amount,
            start_time,
            ending_trigger,
            num_winners,
        }
        .data(),
        chaindraw::accounts::CreateCampaign {
            campaign,
            authority: authority.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn join_campaign_ix(
    campaign: Pubkey,
    entry: Pubkey,
    verifier: Pubkey,
    participant: Pubkey,
    verification_hash: [u8; 32],
) -> Instruction {
    Instruction::new_with_bytes(
        chaindraw::id(),
        &chaindraw::instruction::JoinCampaign { verification_hash }.data(),
        chaindraw::accounts::JoinCampaign {
            campaign,
            entry,
            verifier,
            participant,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn request_draw_ix(campaign: Pubkey, caller: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        chaindraw::id(),
        &chaindraw::instruction::RequestDraw {}.data(),
        chaindraw::accounts::RequestDraw { campaign, caller }.to_account_metas(None),
    )
}

fn resolve_draw_ix(campaign: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        chaindraw::id(),
        &chaindraw::instruction::ResolveDraw {}.data(),
        chaindraw::accounts::ResolveDraw {
            campaign,
            slot_hashes: slot_hashes_id(),
        }
        .to_account_metas(None),
    )
}

fn claim_prize_ix(campaign: Pubkey, entry: Pubkey, participant: Pubkey, caller: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        chaindraw::id(),
        &chaindraw::instruction::ClaimPrize {}.data(),
        chaindraw::accounts::ClaimPrize {
            campaign,
            entry,
            participant,
            caller,
        }
        .to_account_metas(None),
    )
}

/// authority + verifier + a funded, open campaign, ready for join tests.
struct Fixture {
    svm: LiteSVM,
    authority: Keypair,
    verifier: Keypair,
    campaign: Pubkey,
}

fn setup_campaign_with(ending_trigger: EndingTrigger, num_winners: u8) -> Fixture {
    let mut svm = new_svm();
    let authority = Keypair::new();
    let verifier = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10 * ONE_SOL).unwrap();
    svm.airdrop(&verifier.pubkey(), 10 * ONE_SOL).unwrap();

    let campaign_id = 1u64;
    let campaign = campaign_pda(&authority.pubkey(), campaign_id);
    let ix = create_campaign_ix(
        &authority,
        campaign,
        campaign_id,
        verifier.pubkey(),
        ONE_SOL,
        NOW - 10,
        ending_trigger,
        num_winners,
    );
    let res = send(&mut svm, ix, &authority, &[]);
    assert!(res.is_ok(), "setup create_campaign failed: {res:?}");

    Fixture {
        svm,
        authority,
        verifier,
        campaign,
    }
}

fn setup_campaign(ending_trigger: EndingTrigger) -> Fixture {
    setup_campaign_with(ending_trigger, 3)
}

fn join(fx: &mut Fixture, participant: &Keypair) -> litesvm::types::TransactionResult {
    let entry = entry_pda(&fx.campaign, &participant.pubkey());
    let ix = join_campaign_ix(
        fx.campaign,
        entry,
        fx.verifier.pubkey(),
        participant.pubkey(),
        [7u8; 32],
    );
    send(&mut fx.svm, ix, &fx.verifier, &[participant])
}

fn get_campaign(svm: &LiteSVM, campaign: &Pubkey) -> chaindraw::state::Campaign {
    let account = svm.get_account(campaign).unwrap();
    let mut data: &[u8] = &account.data;
    chaindraw::state::Campaign::try_deserialize(&mut data).unwrap()
}

/// Drives a campaign all the way to a completed draw: joins `n` distinct
/// participants, requests the draw, warps past the committed slot with a
/// published hash, and resolves it. Returns the participants (so callers
/// can find winners) plus the resolved campaign.
fn play_to_completed_draw(fx: &mut Fixture, n: u32) -> (Vec<Keypair>, chaindraw::state::Campaign) {
    let mut participants = Vec::new();
    for _ in 0..n {
        let p = Keypair::new();
        svm_airdrop(&mut fx.svm, &p.pubkey());
        assert!(join(fx, &p).is_ok());
        participants.push(p);
    }

    warp_time(&mut fx.svm, NOW + 20); // past every time_trigger this helper is used with

    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    let req = send(&mut fx.svm, request_draw_ix(fx.campaign, caller.pubkey()), &caller, &[]);
    assert!(req.is_ok(), "request_draw failed: {req:?}");

    let campaign = get_campaign(&fx.svm, &fx.campaign);
    let target_slot = campaign.randomness_target_slot;
    publish_slot_hash(&mut fx.svm, target_slot, 42);
    warp_slot(&mut fx.svm, target_slot + 1);

    let res = send(&mut fx.svm, resolve_draw_ix(fx.campaign), &caller, &[]);
    assert!(res.is_ok(), "resolve_draw failed: {res:?}");

    (participants, get_campaign(&fx.svm, &fx.campaign))
}

fn svm_airdrop(svm: &mut LiteSVM, to: &Pubkey) {
    svm.airdrop(to, ONE_SOL).unwrap();
}

fn logs_contain(res: &litesvm::types::TransactionResult, needle: &str) -> bool {
    let logs = match res {
        Ok(meta) => &meta.logs,
        Err(fail) => &fail.meta.logs,
    };
    logs.iter().any(|l| l.contains(needle))
}

// ---------------------------------------------------------------------
// Positive paths
// ---------------------------------------------------------------------

#[test]
fn create_campaign_succeeds_and_funds_vault() {
    let fx = setup_campaign(time_trigger(NOW + 3600));

    let account = fx.svm.get_account(&fx.campaign).unwrap();
    let campaign = get_campaign(&fx.svm, &fx.campaign);

    assert_eq!(campaign.authority, fx.authority.pubkey());
    assert_eq!(campaign.verifier, fx.verifier.pubkey());
    assert_eq!(campaign.entry_count, 0);
    assert_eq!(campaign.num_winners, 3);
    assert_eq!(campaign.prize_amount, ONE_SOL);
    assert_eq!(campaign.ending_trigger, time_trigger(NOW + 3600));

    // vault == the campaign PDA itself: rent-exempt minimum + the prize.
    let rent_exempt_min = fx.svm.minimum_balance_for_rent_exemption(account.data.len());
    assert_eq!(account.lamports, rent_exempt_min + ONE_SOL);
}

#[test]
fn join_campaign_succeeds_and_increments_entry_count() {
    let mut fx = setup_campaign(time_trigger(NOW + 3600));
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());

    let res = join(&mut fx, &participant);
    assert!(res.is_ok(), "join_campaign failed: {res:?}");

    let entry_addr = entry_pda(&fx.campaign, &participant.pubkey());
    let entry_account = fx.svm.get_account(&entry_addr).unwrap();
    let mut data: &[u8] = &entry_account.data;
    let entry = chaindraw::state::Entry::try_deserialize(&mut data).unwrap();
    assert_eq!(entry.participant, participant.pubkey());
    assert_eq!(entry.entry_index, 0);
    assert!(!entry.claimed);

    let campaign = get_campaign(&fx.svm, &fx.campaign);
    assert_eq!(campaign.entry_count, 1);
}

#[test]
fn full_campaign_lifecycle_draws_and_pays_out_a_winner() {
    let mut fx = setup_campaign_with(time_trigger(NOW + 10), 2);
    let (participants, campaign) = play_to_completed_draw(&mut fx, 5);

    assert_eq!(campaign.winners_drawn, 2);
    let winners: Vec<u32> = campaign.winner_indices[0..2].to_vec();
    // Distinct winners, each a valid index into the 5 entries.
    assert_ne!(winners[0], winners[1]);
    for w in &winners {
        assert!(*w < 5);
    }

    // Pay out the first winner and check balances move exactly as expected.
    let winner_participant = &participants[winners[0] as usize];
    let entry = entry_pda(&fx.campaign, &winner_participant.pubkey());

    let vault_before = fx.svm.get_balance(&fx.campaign).unwrap();
    let winner_before = fx.svm.get_balance(&winner_participant.pubkey()).unwrap();

    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    let res = send(
        &mut fx.svm,
        claim_prize_ix(fx.campaign, entry, winner_participant.pubkey(), caller.pubkey()),
        &caller,
        &[],
    );
    assert!(res.is_ok(), "claim_prize failed: {res:?}");

    let per_winner = ONE_SOL / 2;
    let vault_after = fx.svm.get_balance(&fx.campaign).unwrap();
    let winner_after = fx.svm.get_balance(&winner_participant.pubkey()).unwrap();
    assert_eq!(vault_before - vault_after, per_winner);
    assert_eq!(winner_after - winner_before, per_winner);

    // Re-claiming the same entry must fail. Force a fresh blockhash so this
    // otherwise byte-identical transaction isn't just rejected as a
    // duplicate before it reaches program logic.
    fx.svm.expire_blockhash();
    let replay = send(
        &mut fx.svm,
        claim_prize_ix(fx.campaign, entry, winner_participant.pubkey(), caller.pubkey()),
        &caller,
        &[],
    );
    assert!(replay.is_err());
    assert!(logs_contain(&replay, "AlreadyClaimed"));
}

// ---------------------------------------------------------------------
// Negative paths — these matter more than the happy path for a trust product.
// ---------------------------------------------------------------------

#[test]
fn create_campaign_rejects_invalid_time_range() {
    let mut svm = new_svm();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10 * ONE_SOL).unwrap();
    let campaign_id = 1u64;
    let campaign = campaign_pda(&authority.pubkey(), campaign_id);

    let ix = create_campaign_ix(
        &authority,
        campaign,
        campaign_id,
        Keypair::new().pubkey(),
        0,
        NOW,
        time_trigger(NOW),
        1,
    );
    let res = send(&mut svm, ix, &authority, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "InvalidTimeRange"));
}

#[test]
fn create_campaign_rejects_zero_target_entry_count() {
    let mut svm = new_svm();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10 * ONE_SOL).unwrap();
    let campaign_id = 1u64;
    let campaign = campaign_pda(&authority.pubkey(), campaign_id);

    let ix = create_campaign_ix(
        &authority,
        campaign,
        campaign_id,
        Keypair::new().pubkey(),
        0,
        NOW,
        count_trigger(0),
        1,
    );
    let res = send(&mut svm, ix, &authority, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "InvalidTargetEntryCount"));
}

#[test]
fn create_campaign_rejects_zero_winners() {
    let mut svm = new_svm();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10 * ONE_SOL).unwrap();
    let campaign_id = 1u64;
    let campaign = campaign_pda(&authority.pubkey(), campaign_id);

    let ix = create_campaign_ix(
        &authority,
        campaign,
        campaign_id,
        Keypair::new().pubkey(),
        0,
        NOW,
        time_trigger(NOW + 3600),
        0,
    );
    let res = send(&mut svm, ix, &authority, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "InvalidWinnerCount"));
}

#[test]
fn create_campaign_rejects_too_many_winners() {
    let mut svm = new_svm();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10 * ONE_SOL).unwrap();
    let campaign_id = 1u64;
    let campaign = campaign_pda(&authority.pubkey(), campaign_id);

    let ix = create_campaign_ix(
        &authority,
        campaign,
        campaign_id,
        Keypair::new().pubkey(),
        0,
        NOW,
        time_trigger(NOW + 3600),
        51,
    );
    let res = send(&mut svm, ix, &authority, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "InvalidWinnerCount"));
}

#[test]
fn join_campaign_rejects_duplicate_entry() {
    let mut fx = setup_campaign(time_trigger(NOW + 3600));
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());

    assert!(join(&mut fx, &participant).is_ok());
    // Deterministic PDA collision: the `init` constraint on the Entry
    // account is the duplicate-entry guard, enforced by the runtime.
    assert!(join(&mut fx, &participant).is_err());
}

#[test]
fn join_campaign_rejects_after_end_time() {
    let mut fx = setup_campaign(time_trigger(NOW + 10));
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());

    warp_time(&mut fx.svm, NOW + 20); // past end_time

    let res = join(&mut fx, &participant);
    assert!(res.is_err());
    assert!(logs_contain(&res, "EndingTriggerReached"));
}

#[test]
fn join_campaign_rejects_non_verifier_signer() {
    let mut fx = setup_campaign(time_trigger(NOW + 3600));
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());

    let impostor = Keypair::new();
    fx.svm.airdrop(&impostor.pubkey(), ONE_SOL).unwrap();

    let entry = entry_pda(&fx.campaign, &participant.pubkey());
    let ix = join_campaign_ix(
        fx.campaign,
        entry,
        impostor.pubkey(),
        participant.pubkey(),
        [7u8; 32],
    );
    let res = send(&mut fx.svm, ix, &impostor, &[&participant]);
    assert!(res.is_err());
}

#[test]
fn join_campaign_response_based_fills_exactly_to_target_then_rejects() {
    let mut fx = setup_campaign(count_trigger(2));

    let p1 = Keypair::new();
    svm_airdrop(&mut fx.svm, &p1.pubkey());
    assert!(join(&mut fx, &p1).is_ok());

    let p2 = Keypair::new();
    svm_airdrop(&mut fx.svm, &p2.pubkey());
    let last = join(&mut fx, &p2);
    assert!(last.is_ok(), "the join that fills the last slot must succeed: {last:?}");

    let campaign = get_campaign(&fx.svm, &fx.campaign);
    assert_eq!(campaign.entry_count, 2);

    // No clock has advanced at all — the target itself is the cutoff.
    let p3 = Keypair::new();
    svm_airdrop(&mut fx.svm, &p3.pubkey());
    let overflow = join(&mut fx, &p3);
    assert!(overflow.is_err());
    assert!(logs_contain(&overflow, "EndingTriggerReached"));
}

#[test]
fn request_draw_rejects_before_ending_trigger_met() {
    let mut fx = setup_campaign(time_trigger(NOW + 3600));
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());
    assert!(join(&mut fx, &participant).is_ok());

    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    let res = send(&mut fx.svm, request_draw_ix(fx.campaign, caller.pubkey()), &caller, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "EndingTriggerNotMet"));
}

#[test]
fn request_draw_rejects_with_no_entries() {
    let mut fx = setup_campaign(time_trigger(NOW + 10));
    warp_time(&mut fx.svm, NOW + 20);

    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    let res = send(&mut fx.svm, request_draw_ix(fx.campaign, caller.pubkey()), &caller, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "NoEntries"));
}

#[test]
fn request_draw_rejects_when_entries_below_num_winners() {
    let mut fx = setup_campaign_with(time_trigger(NOW + 10), 3);
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());
    assert!(join(&mut fx, &participant).is_ok()); // 1 entry, needs 3 winners

    warp_time(&mut fx.svm, NOW + 20);

    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    let res = send(&mut fx.svm, request_draw_ix(fx.campaign, caller.pubkey()), &caller, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "NotEnoughEntries"));
}

#[test]
fn request_draw_rejects_when_already_requested() {
    let mut fx = setup_campaign_with(time_trigger(NOW + 10), 1);
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());
    assert!(join(&mut fx, &participant).is_ok());
    warp_time(&mut fx.svm, NOW + 20);

    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    assert!(send(&mut fx.svm, request_draw_ix(fx.campaign, caller.pubkey()), &caller, &[]).is_ok());

    // Force a different blockhash so the second (otherwise byte-identical)
    // transaction doesn't get rejected as a plain duplicate before it ever
    // reaches program logic.
    fx.svm.expire_blockhash();
    let second = send(&mut fx.svm, request_draw_ix(fx.campaign, caller.pubkey()), &caller, &[]);
    assert!(second.is_err());
    assert!(logs_contain(&second, "DrawAlreadyRequested"));
}

#[test]
fn resolve_draw_rejects_without_a_prior_request() {
    let mut fx = setup_campaign(time_trigger(NOW + 10));
    let res = send(&mut fx.svm, resolve_draw_ix(fx.campaign), &fx.authority, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "NotAwaitingDraw"));
}

#[test]
fn resolve_draw_rejects_before_target_slot_reached() {
    let mut fx = setup_campaign_with(time_trigger(NOW + 10), 1);
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());
    assert!(join(&mut fx, &participant).is_ok());
    warp_time(&mut fx.svm, NOW + 20);

    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    assert!(send(&mut fx.svm, request_draw_ix(fx.campaign, caller.pubkey()), &caller, &[]).is_ok());

    // No slot warp — still at the slot the draw was requested at.
    let res = send(&mut fx.svm, resolve_draw_ix(fx.campaign), &caller, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "RandomnessSlotNotReachedYet"));
}

#[test]
fn resolve_draw_rejects_when_slot_hash_missing() {
    let mut fx = setup_campaign_with(time_trigger(NOW + 10), 1);
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());
    assert!(join(&mut fx, &participant).is_ok());
    warp_time(&mut fx.svm, NOW + 20);

    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    assert!(send(&mut fx.svm, request_draw_ix(fx.campaign, caller.pubkey()), &caller, &[]).is_ok());

    let campaign = get_campaign(&fx.svm, &fx.campaign);
    // Warp past the target slot but never publish its hash.
    warp_slot(&mut fx.svm, campaign.randomness_target_slot + 1);

    let res = send(&mut fx.svm, resolve_draw_ix(fx.campaign), &caller, &[]);
    assert!(res.is_err());
    assert!(logs_contain(&res, "RandomnessSlotExpired"));
}

#[test]
fn claim_prize_rejects_before_draw_completed() {
    let mut fx = setup_campaign_with(time_trigger(NOW + 10), 1);
    let participant = Keypair::new();
    svm_airdrop(&mut fx.svm, &participant.pubkey());
    assert!(join(&mut fx, &participant).is_ok());

    let entry = entry_pda(&fx.campaign, &participant.pubkey());
    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    let res = send(
        &mut fx.svm,
        claim_prize_ix(fx.campaign, entry, participant.pubkey(), caller.pubkey()),
        &caller,
        &[],
    );
    assert!(res.is_err());
    assert!(logs_contain(&res, "DrawNotCompleted"));
}

#[test]
fn claim_prize_rejects_a_non_winning_entry() {
    let mut fx = setup_campaign_with(time_trigger(NOW + 10), 1);
    let (participants, campaign) = play_to_completed_draw(&mut fx, 5);

    let winner_idx = campaign.winner_indices[0];
    let loser = participants
        .iter()
        .enumerate()
        .find(|(i, _)| *i as u32 != winner_idx)
        .map(|(_, p)| p)
        .unwrap();

    let entry = entry_pda(&fx.campaign, &loser.pubkey());
    let caller = Keypair::new();
    fx.svm.airdrop(&caller.pubkey(), ONE_SOL).unwrap();
    let res = send(
        &mut fx.svm,
        claim_prize_ix(fx.campaign, entry, loser.pubkey(), caller.pubkey()),
        &caller,
        &[],
    );
    assert!(res.is_err());
    assert!(logs_contain(&res, "NotAWinningEntry"));
}
