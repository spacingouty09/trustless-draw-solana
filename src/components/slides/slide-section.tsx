import type { ReactNode } from "react";
import {
  Bot,
  Box,
  Compass,
  EyeOff,
  FlaskConical,
  Gift,
  Handshake,
  HeartHandshake,
  Lock,
  Radio,
  ReceiptText,
  ScanSearch,
  ShieldCheck,
  Shuffle,
  SquareTerminal,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { SlideCardData, SlideIcon } from "./slides.data";

const ICONS: Record<SlideIcon, LucideIcon> = {
  "eye-off": EyeOff,
  box: Box,
  receipt: ReceiptText,
  lock: Lock,
  ticket: Ticket,
  scan: ScanSearch,
  gift: Gift,
  shuffle: Shuffle,
  heart: HeartHandshake,
  handshake: Handshake,
  wallet: Wallet,
  shield: ShieldCheck,
  users: Users,
  radio: Radio,
  flask: FlaskConical,
  compass: Compass,
  trending: TrendingUp,
  terminal: SquareTerminal,
  bot: Bot,
};

export function SlideSection({
  id,
  headingId,
  children,
}: {
  id: string;
  headingId: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-slide
      aria-labelledby={headingId}
      tabIndex={-1}
      className="slide-section relative flex flex-col justify-center overflow-hidden border-b border-border/40 outline-none"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-20 md:pr-16">
        {children}
      </div>
    </section>
  );
}

export function SlideEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </p>
  );
}

export function SlideHeadline({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-3 max-w-3xl font-display text-2xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
    >
      {children}
    </h2>
  );
}

export function SlideCardGrid({ count, children }: { count: number; children: ReactNode }) {
  const cols = count >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={`mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 ${cols}`}>{children}</div>
  );
}

export function SlideCard({ card, index }: { card: SlideCardData; index?: number }) {
  const Icon = card.icon ? ICONS[card.icon] : null;
  return (
    <div className="group rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition-colors hover:border-primary/40 sm:p-5">
      <div
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-colors group-hover:text-primary"
      >
        {index !== undefined ? (
          <span className="font-display text-xs font-semibold">
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : Icon ? (
          <Icon className="h-4 w-4" />
        ) : null}
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">{card.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
    </div>
  );
}
