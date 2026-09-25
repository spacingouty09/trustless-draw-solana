import { useEffect, useState, type MouseEvent } from "react";
import type { Slide } from "./slides.data";

// Right-edge rail. Anchors render on the server so the rail works without JS;
// only the active-slide tracking is client-side.
export function SlideDots({ slides }: { slides: readonly Slide[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-slide]"));
    // A thin band through the viewport's vertical centre: exactly one slide
    // crosses it at a time, so no ratio thresholds to tune.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(sections.indexOf(entry.target as HTMLElement));
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  function jump(e: MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav
      aria-label="Slide navigation"
      className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 md:flex"
    >
      <ol className="flex flex-col items-center">
        {slides.map((slide, i) => {
          const isActive = i === active;
          return (
            <li key={slide.id}>
              <a
                href={`#${slide.id}`}
                onClick={(e) => jump(e, slide.id)}
                aria-current={isActive ? "true" : undefined}
                className="group relative flex items-center justify-center rounded-full p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="sr-only">
                  Slide {i + 1}: {slide.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`block w-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "h-5 bg-primary shadow-[0_0_8px_oklch(0.78_0.19_162)]"
                      : "h-1.5 bg-muted-foreground/40 group-hover:bg-muted-foreground"
                  }`}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-full mr-1 whitespace-nowrap rounded-md border border-border bg-card/90 px-2 py-1 font-display text-[11px] uppercase tracking-[0.15em] text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {slide.label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
