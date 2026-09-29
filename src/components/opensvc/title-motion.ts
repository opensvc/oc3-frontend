/**
 * Motion of the panel title: when the order of its titles changes — a record shown
 * goes in front — the titles slide from where they were to their new place, and a
 * new one comes in from the left.
 *
 * Showing another record may swap the whole panel (a node opened from a service),
 * or come after the panel was closed, so the last layout is kept here, outside the
 * panels: each open panel title measures its row after rendering, and plays the
 * move from the previous layout when its order differs.
 */

type Positions = Map<string, number>;

let last: { signature: string; positions: Positions } | null = null;

const DURATION_MS = 220;

/** Positions within the row; `offsetLeft` ignores a move still playing. */
function measure(row: HTMLElement): Positions {
  const positions: Positions = new Map();
  for (const pill of row.querySelectorAll<HTMLElement>("[data-pill]")) {
    const key = pill.dataset.pill;
    if (key !== undefined) positions.set(key, pill.offsetLeft);
  }
  return positions;
}

/**
 * Called by an open panel title after each render. `signature` names the order of
 * its titles and the one on display: the move plays only when it changed.
 */
export function moveTitleRow(row: HTMLElement, signature: string): void {
  const now = measure(row);
  const before = last;
  last = { signature, positions: now };
  if (before === null || before.signature === signature) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
