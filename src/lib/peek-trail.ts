/**
 * The record opened in the panel over the current view, kept in the URL (`peek`) as
 * `kind:id` like the rest of the panel state: a reload or a shared link reopen it,
 * and the browser Back button returns to what was on display before. The records
 * shown before it are the panel history, kept with the account (`useHistoryPref`).
 *
 * An older URL may carry several records, `kind:id,kind:id…`, with `peekat` giving
 * the one on display, the first by default: that record opens.
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
