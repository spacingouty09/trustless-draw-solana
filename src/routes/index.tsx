import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check, Copy, Minus, X } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/product";
import { SLIDES, type Cell, type Slide } from "@/components/slides/slides.data";
import {
  SlideCard,
  SlideCardGrid,
  SlideEyebrow,
  SlideHeadline,
  SlideSection,
} from "@/components/slides/slide-section";
import { SlideDots } from "@/components/slides/slide-dots";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${PRODUCT_NAME} — Promises you can check.` },
      {
        name: "description",
        content:
          "Get new creators from 0 to 1 with verifiable giveaways: the prize is locked on-chain before entry, every action is verified, and the winner is proven. Runnable by you or your agent.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  // The document is the scroller, so snap is toggled on <html> and removed on
  // leave. Effects don't run during SSR, which keeps the markup identical.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("snap-page");
    return () => root.classList.remove("snap-page");
  }, []);

  return (
    <>
      {SLIDES.map((slide, i) => (
        <SlideSection key={slide.id} id={slide.id} headingId={`${slide.id}-h`}>
          {renderSlide(slide, i)}
        </SlideSection>
      ))}
      <SlideDots slides={SLIDES} />
    </>
  );
}

function renderSlide(slide: Slide, i: number) {
  const headingId = `${slide.id}-h`;
  const eyebrow = `${String(i).padStart(2, "0")} / ${slide.label}`;

  switch (slide.kind) {
    case "hero":
      return <Hero slide={slide} headingId={headingId} />;

    case "cards":
      return (
        <>
          <SlideEyebrow>{eyebrow}</SlideEyebrow>
          <SlideHeadline id={headingId}>{slide.headline}</SlideHeadline>
          {slide.command && <CommandLine command={slide.command} />}
          <SlideCardGrid count={slide.cards.length}>
            {slide.cards.map((card, j) => (
              <SlideCard key={card.title} card={card} index={slide.numbered ? j : undefined} />
            ))}
          </SlideCardGrid>
          {slide.footnote && (
            <p className="mt-8 font-display text-lg text-foreground/90 sm:text-xl">
              {slide.footnote}
            </p>
          )}
        </>
      );

    case "platforms":
      return (
        <>
          <SlideEyebrow>{eyebrow}</SlideEyebrow>
          <SlideHeadline id={headingId}>{slide.headline}</SlideHeadline>
          <div className="mt-10 space-y-6">
            <PlatformRow tag="Live" names={slide.live} live />
            <PlatformRow tag="Next" names={slide.next} />
          </div>
          <p className="mt-8 text-sm text-muted-foreground sm:text-base">{slide.footnote}</p>
        </>
      );

    case "table":
      return (
        <>
          <SlideEyebrow>{eyebrow}</SlideEyebrow>
          <SlideHeadline id={headingId}>{slide.headline}</SlideHeadline>
          <div className="mt-10 overflow-x-auto rounded-xl border border-border bg-card/60 backdrop-blur">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Feature comparison: {slide.columns.join(", ")}</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-5 py-4 font-normal text-muted-foreground">
                    <span className="sr-only">Feature</span>
                  </th>
                  {slide.columns.map((col, c) => (
                    <th
                      key={col}
                      scope="col"
                      className={`px-5 py-4 text-center font-display font-semibold ${
                        c === slide.columns.length - 1 ? "text-primary" : ""
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slide.rows.map((row) => (
                  <tr key={row.label} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="px-5 py-3.5 font-normal text-foreground/90">
                      {row.label}
                    </th>
                    {row.cells.map((cell, c) => (
                      <td
                        key={c}
                        className={`px-5 py-3.5 text-center ${
                          c === row.cells.length - 1 ? "bg-primary/5" : ""
                        }`}
                      >
                        <CellMark value={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );

    case "contact":
      return (
        <>
          <SlideEyebrow>{eyebrow}</SlideEyebrow>
          <SlideHeadline id={headingId}>{slide.headline}</SlideHeadline>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">{slide.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/organizer" className={primaryCta}>
              Run a campaign <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/campaigns" className={secondaryCta}>
              Browse campaigns
            </Link>
            <Link to="/support" className={secondaryCta}>
              Get in touch
            </Link>
          </div>
        </>
      );
  }
}

const ctaBase =
  "inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const primaryCta = `${ctaBase} bg-foreground text-background hover:opacity-90`;
const secondaryCta = `${ctaBase} border border-border bg-card/60 backdrop-blur hover:bg-card`;

function Hero({
  slide,
  headingId,
}: {
  slide: Extract<Slide, { kind: "hero" }>;
  headingId: string;
}) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
      <SlideEyebrow>{slide.eyebrow}</SlideEyebrow>
      <p className="mt-5 font-display text-5xl font-semibold lowercase tracking-tight sm:text-7xl lg:text-8xl">
        {PRODUCT_NAME}
      </p>
      <h1
        id={headingId}
        className="mt-4 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
      >
        <span className="text-gradient">{slide.headline}</span>
      </h1>
      <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">{slide.body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#slide-01" className={primaryCta}>
          See how it works
        </a>
        <Link to="/campaigns" className={secondaryCta}>
          Browse campaigns
        </Link>
      </div>
      <div
        aria-hidden="true"
        className="mt-16 hidden items-center gap-2 font-display text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70 md:flex"
      >
        Scroll <ArrowDown className="h-3 w-3 motion-safe:animate-bounce" />
      </div>
    </div>
  );
}

function PlatformRow({ tag, names, live }: { tag: string; names: string[]; live?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <span
        className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-display text-[11px] uppercase tracking-[0.2em] ${
          live ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            live ? "bg-primary shadow-[0_0_8px_oklch(0.78_0.19_162)]" : "bg-muted-foreground/50"
          }`}
        />
        {tag}
      </span>
      <ul className="flex flex-wrap gap-2">
        {names.map((name) => (
          <li
            key={name}
            className={`rounded-lg border px-4 py-2.5 font-display text-sm font-medium backdrop-blur ${
              live
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-border bg-card/60 text-muted-foreground"
            }`}
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CellMark({ value }: { value: Cell }) {
  if (value === "yes")
    return (
      <>
        <Check className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </>
    );
  if (value === "partial")
    return (
      <>
        <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Partial</span>
      </>
    );
  return (
    <>
      <X className="mx-auto h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
      <span className="sr-only">No</span>
    </>
  );
}

function CommandLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard writes can be denied (permissions, embedded frames). Select
      // the command instead so a manual copy is one keystroke away.
      const range = document.createRange();
      range.selectNodeContents(codeRef.current!);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  return (
    <div className="mt-8 flex max-w-3xl items-center gap-3 rounded-xl border border-border bg-background/80 py-2 pl-4 pr-2 backdrop-blur">
      <span aria-hidden="true" className="select-none font-mono text-sm text-primary">
        $
      </span>
      <code
        ref={codeRef}
        className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-1.5 font-mono text-xs text-foreground/90 sm:text-sm"
      >
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
