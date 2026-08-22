import { PRODUCT_NAME } from "@/lib/product";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-xs text-muted-foreground sm:flex-row">
        <span>{PRODUCT_NAME} · Trustless social giveaways on Solana</span>
        <span>Solana AI Hackathon KL · Payments track</span>
      </div>
    </footer>
  );
}
