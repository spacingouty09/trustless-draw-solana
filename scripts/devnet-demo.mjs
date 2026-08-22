// One-off devnet demo/verification script for ChainDraw's Anchor program.
// Not part of the app — throwaway ops tooling to produce a replayable,
// judge-verifiable campaign (program ID + campaign PDA + every tx sig).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("mVfGuxEb9jWRWpf2n7wzRmEESqdvCWaBx9zQCALuJWz");
const conn = new Connection("https://api.devnet.solana.com", "confirmed");

const DISC = {
  create_campaign: Buffer.from([111, 131, 187, 98, 160, 193, 114, 244]),
  join_campaign: Buffer.from([139, 142, 101, 28, 183, 90, 68, 4]),
  request_draw: Buffer.from([22, 180, 8, 81, 47, 21, 86, 159]),
  resolve_draw: Buffer.from([115, 132, 65, 125, 65, 181, 26, 60]),
  claim_prize: Buffer.from([157, 233, 139, 121, 246, 62, 234, 235]),
};

const SEED_CAMPAIGN = Buffer.from("campaign");
const SEED_ENTRY = Buffer.from("entry");
const SLOT_HASHES_SYSVAR = new PublicKey("SysvarS1otHashes111111111111111111111111111");
const SYSTEM_PROGRAM = SystemProgram.programId;

function loadKeypair(p) {
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function u64le(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}
function i64le(n) {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(n));
  return b;
}
function u32le(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

function campaignPda(authority, campaignId) {
  return PublicKey.findProgramAddressSync(
    [SEED_CAMPAIGN, authority.toBuffer(), u64le(campaignId)],
    PROGRAM_ID,
  )[0];
}
function entryPda(campaign, participant) {
  return PublicKey.findProgramAddressSync(
    [SEED_ENTRY, campaign.toBuffer(), participant.toBuffer()],
    PROGRAM_ID,
  )[0];
}

// EndingTrigger::ResponseCount { target_entry_count } — variant index 1.
function encodeResponseCountTrigger(targetEntryCount) {
  return Buffer.concat([Buffer.from([1]), u32le(targetEntryCount)]);
}

function ix(programId, keys, data) {
  return new TransactionInstruction({ programId, keys, data });
}

async function send(signers, instructions, label) {
  const tx = new Transaction().add(...instructions);
  const sig = await sendAndConfirmTransaction(conn, tx, signers, {
    commitment: "confirmed",
  });
  console.log(`[ok] ${label}: ${sig}`);
  return sig;
}

// Sequential Borsh-aware decoder for the Campaign account (skips the 8-byte
// Anchor discriminator). Mirrors state.rs field order exactly — the
// EndingTrigger enum is variable-length in Borsh, so everything after it
// must be read with a moving cursor, not fixed offsets.
function decodeCampaign(data) {
  let o = 8;
  const authority = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const verifier = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const campaignId = data.readBigUInt64LE(o); o += 8;
  const prizeAmount = data.readBigUInt64LE(o); o += 8;
  const startTime = data.readBigInt64LE(o); o += 8;
  const triggerTag = data.readUInt8(o); o += 1;
  let endingTrigger;
  if (triggerTag === 0) {
    endingTrigger = { kind: "Time", endTime: data.readBigInt64LE(o) };
    o += 8;
  } else {
    endingTrigger = { kind: "ResponseCount", targetEntryCount: data.readUInt32LE(o) };
    o += 4;
  }
  const entryCount = data.readUInt32LE(o); o += 4;
  const numWinners = data.readUInt8(o); o += 1;
  const stateTag = data.readUInt8(o); o += 1;
  const state = ["Open", "Drawing", "Completed", "Cancelled"][stateTag];
  const randomnessTargetSlot = data.readBigUInt64LE(o); o += 8;
  const winnerIndices = [];
  for (let i = 0; i < 50; i++) {
    winnerIndices.push(data.readUInt32LE(o));
    o += 4;
  }
  const winnersDrawn = data.readUInt8(o); o += 1;
  const bump = data.readUInt8(o); o += 1;
  return {
    authority, verifier, campaignId, prizeAmount, startTime, endingTrigger,
    entryCount, numWinners, state, randomnessTargetSlot,
    winnerIndices: winnerIndices.slice(0, winnersDrawn), winnersDrawn, bump,
  };
}

async function main() {
  const authority = loadKeypair(path.join(os.homedir(), ".config/solana/id.json"));
  const verifier = Keypair.generate();
  const cranker = Keypair.generate();
  const participants = [Keypair.generate(), Keypair.generate(), Keypair.generate()];

  console.log("=== ChainDraw devnet demo campaign ===");
  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Authority (creator):", authority.publicKey.toBase58());
  console.log("Verifier:", verifier.publicKey.toBase58());
  console.log("Cranker (permissionless caller):", cranker.publicKey.toBase58());
  participants.forEach((p, i) => console.log(`Participant ${i}:`, p.publicKey.toBase58()));

  // Fund verifier (pays entry-PDA rent) and cranker (pays crank tx fees).
  // Participants need zero SOL — they only sign, never pay.
  await send(
    [authority],
    [
      SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: verifier.publicKey, lamports: 0.05e9 }),
      SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: cranker.publicKey, lamports: 0.05e9 }),
    ],
    "fund verifier + cranker",
  );

  const campaignId = BigInt(Date.now());
  const campaign = campaignPda(authority.publicKey, campaignId);
  const prizeAmount = 0.02e9; // 0.02 SOL total
  const numWinners = 2;
  const targetEntryCount = participants.length; // response-based: closes on the 3rd join

  console.log("\nCampaign PDA:", campaign.toBase58());
  console.log(`Prize: ${prizeAmount / 1e9} SOL, ${numWinners} winners, closes at ${targetEntryCount} entries\n`);

  // --- create_campaign ---
  const createData = Buffer.concat([
    DISC.create_campaign,
    u64le(campaignId),
    verifier.publicKey.toBuffer(),
    u64le(prizeAmount),
    i64le(Math.floor(Date.now() / 1000)),
    encodeResponseCountTrigger(targetEntryCount),
    Buffer.from([numWinners]),
  ]);
  await send(
    [authority],
    [
      ix(PROGRAM_ID, [
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      ], createData),
    ],
    "create_campaign",
  );

  // --- join_campaign x3 ---
  const entries = participants.map((p) => entryPda(campaign, p.publicKey));
  for (let i = 0; i < participants.length; i++) {
    const verificationHash = Buffer.alloc(32, i + 1); // placeholder — M1 doesn't wire real platform verification yet
    const joinData = Buffer.concat([DISC.join_campaign, verificationHash]);
    await send(
      [verifier, participants[i]],
      [
        ix(PROGRAM_ID, [
          { pubkey: campaign, isSigner: false, isWritable: true },
          { pubkey: entries[i], isSigner: false, isWritable: true },
          { pubkey: verifier.publicKey, isSigner: true, isWritable: true },
          { pubkey: participants[i].publicKey, isSigner: true, isWritable: false },
          { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
        ], joinData),
      ],
      `join_campaign #${i}`,
    );
  }

  // --- request_draw ---
  await send(
    [cranker],
    [
      ix(PROGRAM_ID, [
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: cranker.publicKey, isSigner: true, isWritable: false },
      ], DISC.request_draw),
    ],
    "request_draw",
  );

  let state = decodeCampaign((await conn.getAccountInfo(campaign)).data);
  console.log(`\nCommitted randomness_target_slot = ${state.randomnessTargetSlot}`);

  // --- wait for the committed slot to pass ---
  process.stdout.write("Waiting for target slot to pass");
  for (;;) {
    const slot = BigInt(await conn.getSlot("confirmed"));
    if (slot > state.randomnessTargetSlot) {
      console.log(`\nCurrent slot ${slot} > target ${state.randomnessTargetSlot} — resolving.`);
      break;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 2000));
  }

  // --- resolve_draw ---
  await send(
    [cranker],
    [
      ix(PROGRAM_ID, [
        { pubkey: campaign, isSigner: false, isWritable: true },
        { pubkey: SLOT_HASHES_SYSVAR, isSigner: false, isWritable: false },
      ], DISC.resolve_draw),
    ],
    "resolve_draw",
  );

  state = decodeCampaign((await conn.getAccountInfo(campaign)).data);
  console.log(`\nDraw resolved. state=${state.state} winners_drawn=${state.winnersDrawn}`);
  console.log("Winning entry_index values:", state.winnerIndices);

  // --- claim_prize for each winner ---
  for (const winnerIdx of state.winnerIndices) {
    const winner = participants[winnerIdx];
    const entry = entries[winnerIdx];
    const before = await conn.getBalance(winner.publicKey);
    await send(
      [cranker],
      [
        ix(PROGRAM_ID, [
          { pubkey: campaign, isSigner: false, isWritable: true },
          { pubkey: entry, isSigner: false, isWritable: true },
          { pubkey: winner.publicKey, isSigner: false, isWritable: true },
          { pubkey: cranker.publicKey, isSigner: true, isWritable: true },
        ], DISC.claim_prize),
      ],
      `claim_prize (entry_index ${winnerIdx}, participant ${winner.publicKey.toBase58()})`,
    );
    const after = await conn.getBalance(winner.publicKey);
    console.log(`  -> paid ${(after - before) / 1e9} SOL to participant ${winnerIdx}`);
  }

  console.log("\n=== Summary for independent verification ===");
  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Campaign PDA:", campaign.toBase58());
  console.log("Explorer:", `https://explorer.solana.com/address/${campaign.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
