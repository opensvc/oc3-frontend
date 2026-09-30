import { createContext, useContext, useEffect, useRef, type RefObject } from "react";
import { lastLiveRefresh } from "@/lib/realtime";

const FLASH_MS = 1800;

/**
 * When the user last clicked or pressed a key. What changes on screen after that
 * is attributed to them — a page turned, a sort, a filter, a refresh, a record
 * opened — until the next live event.
 */
let lastInteractionAt = 0;
if (typeof document !== "undefined") {
  const touched = () => {
    lastInteractionAt = Date.now();
  };
  document.addEventListener("pointerdown", touched, { capture: true, passive: true });
  document.addEventListener("keydown", touched, { capture: true, passive: true });
}

/**
 * What a group of flashing elements shows, and since when: a list with its page,
 * sort and filters, a panel with its record. Data arriving after the subject
 * changed is the new subject's, not a change to point out (`FlashScope`).
 */
export const FlashScopeContext = createContext<{ readonly current: number } | null>(null);

/** Briefly tints an element, to point out that what it shows just changed. */
function flash(element: HTMLElement): void {
  const tint = getComputedStyle(element).getPropertyValue("--accent").trim();
  if (tint === "") return;
  // With reduced motion the tint is shown then removed, without fading.
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.animate(
    [
      { backgroundColor: `color-mix(in srgb, ${tint} 35%, transparent)` },
      { backgroundColor: `color-mix(in srgb, ${tint} 35%, transparent)`, offset: 0.25 },
      { backgroundColor: "transparent" },
    ],
    { duration: FLASH_MS, easing: still ? "steps(1, end)" : "ease-out" },
  );
}

/**
 * Flashes an element when what it shows was changed by a live update.
 *
 * `signature` stands for the data shown: the element flashes when it changes,
 * never on its first render. `appear` flashes `target` when the element is mounted:
 * a row the collector just gained.
 *
 * Only a change brought by a live event flashes. The event must be recent, and
 * must have come after the user last clicked or typed, and after the enclosing
 * `FlashScope` last changed subject: what the user brings on screen themselves —
 * another page, a sort, a filter, a refresh, another record — never flashes.
 */
export function useFlash<T extends HTMLElement>(
  signature: string,
  options: { appear?: boolean; target?: (element: T) => HTMLElement | null } = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const previous = useRef<string | null>(null);
  const scope = useContext(FlashScopeContext);
  const { appear = false, target } = options;
  useEffect(() => {
    const before = previous.current;
    previous.current = signature;
    const element = ref.current;
    const live = lastLiveRefresh();
    if (element === null || live <= lastInteractionAt || live <= (scope?.current ?? 0)) return;
    if (before === null) {
      if (appear) flash(target?.(element) ?? element);
    } else if (before !== signature) {
      flash(element);
    }
    // appear, target and scope are read when the signature changes, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return ref;
}
