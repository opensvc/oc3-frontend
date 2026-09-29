/**
 * Motion of the panel title when a record is opened from inside the panel: the
 * titles already shown slide from where they were to their new place, and the new
 * one comes in from the left.
 *
 * Opening a record may swap the whole panel (a node opened from a service), so the
 * positions are kept here, outside the panels: the open panel title registers its
 * row, `usePeek` measures it just before opening the next record, and the title of
 * the panel then on display plays the move once from those positions.
 */

type Positions = Map<string, number>;

let active: HTMLElement | null = null;
let pending: { taken: number; positions: Positions } | null = null;

/** A measure older than this belongs to another gesture: it is not played. */
const PENDING_MS = 1500;
const DURATION_MS = 220;

function measure(row: HTMLElement): Positions {
  const origin = row.getBoundingClientRect().left;
  const positions: Positions = new Map();
  for (const pill of row.querySelectorAll<HTMLElement>("[data-pill]")) {
    const key = pill.dataset.pill;
    if (key !== undefined) positions.set(key, pill.getBoundingClientRect().left - origin);
  }
  return positions;
}

export function registerTitleRow(row: HTMLElement): void {
  active = row;
}

export function unregisterTitleRow(row: HTMLElement): void {
  if (active === row) active = null;
}

/** Called just before a record is opened from inside a panel. */
export function captureTitlePositions(): void {
  pending = active === null ? null : { taken: performance.now(), positions: measure(active) };
}

/** Plays the move measured by `captureTitlePositions`, once, on the given title row. */
export function playTitleMotion(row: HTMLElement): void {
  const before = pending;
  pending = null;
  if (before === null || performance.now() - before.taken > PENDING_MS) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const now = measure(row);
  for (const pill of row.querySelectorAll<HTMLElement>("[data-pill]")) {
    const key = pill.dataset.pill;
    if (key === undefined) continue;
    const from = before.positions.get(key);
    const to = now.get(key) ?? 0;
    if (from === undefined) {
      pill.animate(
        [
          { opacity: 0, transform: "translateX(-24px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: DURATION_MS, easing: "ease-out" },
      );
    } else if (Math.abs(from - to) > 0.5) {
      pill.animate([{ transform: `translateX(${String(from - to)}px)` }, { transform: "none" }], {
        duration: DURATION_MS,
        easing: "ease-out",
      });
    }
  }
}
