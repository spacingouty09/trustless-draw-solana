// Product display name, sourced from VITE_PRODUCT_NAME so branding can
// change without touching code. VITE_ prefix required for client bundles;
// Vite inlines it at build time so it's equally available server-side (same
// pattern as SUPABASE_URL in events.functions.ts).
export const PRODUCT_NAME: string =
  process.env.VITE_PRODUCT_NAME ||
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_PRODUCT_NAME ||
  "Fairseed";
