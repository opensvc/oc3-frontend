/**
 * The record opened from a badge or from a bookmark, over any view, kept in the URL
 * (`peek`) as `kind:id` like the rest of the panel state: a reload or a shared link
 * reopen it, and the browser Back button returns to what was on display before.
 *
 * Opening a record does not build a history any more: only what the user bookmarks
 * is kept (`useBookmarksPref`). An older URL may still carry a path,
 * `kind:id,kind:id…` with `peekat` giving the record on display: that record opens.
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

/** Position of the record on display, clamped to what the path holds. */
export function currentIndex(trail: PeekStep[], raw: unknown): number {
  const last = trail.length - 1;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed)) return last;
  return Math.min(Math.max(Math.trunc(parsed), 0), last);
}
