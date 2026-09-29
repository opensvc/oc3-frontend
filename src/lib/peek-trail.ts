/**
 * The records opened in the panel over the current view, kept in the URL (`peek`)
 * like the rest of the panel state: a reload or a shared link reopen them, and the
 * browser Back button returns to what was on display before.
 *
 * `peek` lists them as `kind:id,kind:id…`, the most recently opened first: a badge
 * clicked inside the panel adds its object in front (see `usePeek`), one clicked
 * anywhere else starts the list again. `peekat` gives the record on display, the
 * first by default; showing an older one changes only `peekat`, never the order.
 */
export interface PeekStep {
  kind: string;
  id: string;
}

/** Ids never contain a comma nor a colon: both are collector uuids or names. */
function parseStep(raw: string): PeekStep | null {
  const cut = raw.indexOf(":");
  if (cut <= 0 || cut === raw.length - 1) return null;
  return { kind: raw.slice(0, cut), id: raw.slice(cut + 1) };
}

export function parseTrail(peek: unknown): PeekStep[] {
  if (typeof peek !== "string" || peek === "") return [];
  return peek
    .split(",")
    .map(parseStep)
    .filter((step): step is PeekStep => step !== null);
}

export function serialiseTrail(trail: PeekStep[]): string | undefined {
  return trail.length === 0 ? undefined : trail.map((s) => `${s.kind}:${s.id}`).join(",");
}

/** Position of the record on display, clamped to what the list holds; the newest by default. */
export function currentIndex(trail: PeekStep[], raw: unknown): number {
  const last = Math.max(trail.length - 1, 0);
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (raw === undefined || raw === null || raw === "" || !Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(Math.trunc(parsed), 0), last);
}

/** Records kept in the list: beyond, the oldest are forgotten. */
const TRAIL_SIZE = 8;

export function sameStep(a: PeekStep, b: PeekStep): boolean {
  return a.kind === b.kind && a.id === b.id;
}

/**
 * The list once `next` is opened from a record of `trail`: in front, as the most
 * recent. Opened again, a record already listed moves to the front.
 */
export function drillTrail(trail: PeekStep[], next: PeekStep): PeekStep[] {
  return [next, ...trail.filter((step) => !sameStep(step, next))].slice(0, TRAIL_SIZE);
}
