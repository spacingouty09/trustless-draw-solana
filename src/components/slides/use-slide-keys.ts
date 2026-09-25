import { useEffect } from "react";

const NEXT = new Set(["ArrowDown", "ArrowRight", "PageDown"]);
const PREV = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);

// Widgets that use arrow keys themselves (the wallet dropdown, form fields)
// keep them — slide navigation only applies when nothing else wants the key.
const OWNS_KEYS =
  'input, textarea, select, [contenteditable="true"], [role="menu"], [role="menubar"], [role="listbox"], [role="dialog"], [role="slider"], [role="tablist"]';

// Arrow keys / PageUp / PageDown step between [data-slide] sections on "/".
export function useSlideKeys() {
  useEffect(() => {
    // Index of a jump still animating, so rapid presses advance from where the
    // page is heading rather than from wherever it is mid-scroll.
    let pending: number | null = null;
    let settle: ReturnType<typeof setTimeout> | undefined;

    const headerLine = () =>
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;

    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const dir = NEXT.has(e.key) ? 1 : PREV.has(e.key) ? -1 : 0;
      if (!dir) return;
      if (e.target instanceof Element && e.target.closest(OWNS_KEYS)) return;

      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-slide]"));
      if (sections.length === 0) return;

      const line = headerLine();
      let target: number;
      if (pending !== null) {
        target = pending + dir;
      } else {
        const rects = sections.map((s) => s.getBoundingClientRect());
        // A slide taller than the screen (short windows) scrolls natively
        // until its edge is reached, so nothing gets skipped.
        const cur = rects.findIndex((r) => r.top <= line + 2 && r.bottom > line + 2);
        if (cur !== -1 && rects[cur].height > window.innerHeight - line + 2) {
          if (dir > 0 && rects[cur].bottom > window.innerHeight + 1) return;
          if (dir < 0 && rects[cur].top < line - 2) return;
        }
        // Otherwise go by position, which also works while a snap is settling.
        if (dir > 0) {
          target = rects.findIndex((r) => r.top > line + 2);
        } else {
          target = -1;
          rects.forEach((r, i) => {
            if (r.top < line - 2) target = i;
          });
        }
      }

      // Past either end: let the browser scroll (reaches the footer / top).
      if (target < 0 || target >= sections.length) return;

      e.preventDefault();
      pending = target;
      const el = sections[target];
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      el.focus({ preventScroll: true });
      history.replaceState(null, "", `#${el.id}`);
      clearTimeout(settle);
      settle = setTimeout(() => (pending = null), 1500);
    }

    // Snap can follow a programmatic scroll with its own short correction, so
    // "scrollend" may fire before the target has landed. Only forget the
    // pending target once it is actually aligned under the header.
    function onScrollEnd() {
      if (pending === null) return;
      const el = document.querySelectorAll<HTMLElement>("[data-slide]")[pending];
      if (!el || Math.abs(el.getBoundingClientRect().top - headerLine()) <= 2) {
        clearTimeout(settle);
        pending = null;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      clearTimeout(settle);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, []);
}
