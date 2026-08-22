// Sign In With Farcaster button. Browser-only: auth-kit talks to the Farcaster
// relay and renders a QR/deeplink flow. Always load this component lazily from
// inside <ClientOnly> — it must never enter the SSR bundle.
import { AuthKitProvider, SignInButton, type StatusAPIResponse } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";

export type FarcasterSignInResult = {
  message: string;
  signature: `0x${string}`;
  fid: number;
  username: string;
  nonce: string;
};

export default function FarcasterSignIn({
  onSignedIn,
  onError,
}: {
  onSignedIn: (result: FarcasterSignInResult) => void;
  onError: (message: string) => void;
}) {
  const config = {
    relay: "https://relay.farcaster.xyz",
    rpcUrl: "https://mainnet.optimism.io",
    domain: window.location.host,
    siweUri: `${window.location.origin}/`,
  };

  const handleSuccess = (res: StatusAPIResponse) => {
    if (!res.message || !res.signature || !res.fid || !res.nonce) {
      onError("Farcaster sign-in returned an incomplete response — please try again.");
      return;
    }
    onSignedIn({
      message: res.message,
      signature: res.signature as `0x${string}`,
      fid: res.fid,
      username: res.username ?? String(res.fid),
      nonce: res.nonce,
    });
  };

  return (
    <AuthKitProvider config={config}>
      <SignInButton onSuccess={handleSuccess} onError={(e) => onError(e?.message ?? "Farcaster sign-in failed")} />
    </AuthKitProvider>
  );
}
