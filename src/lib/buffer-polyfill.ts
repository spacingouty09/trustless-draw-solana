import { Buffer } from "buffer";

// Solana web3.js + wallet adapters reference Buffer/process/global at module
// init. Browsers don't provide them — install polyfills synchronously before
// any adapter module is imported.
const g = globalThis as {
  Buffer?: unknown;
  global?: unknown;
  process?: { env: Record<string, string> };
};
if (!g.Buffer) g.Buffer = Buffer;
if (!g.global) g.global = globalThis;
if (!g.process) g.process = { env: {} };

export {};