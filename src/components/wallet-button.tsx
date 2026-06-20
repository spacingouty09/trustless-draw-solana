import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  return (
    <div className="chaindraw-wallet">
      <WalletMultiButton />
    </div>
  );
}