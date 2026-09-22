/**
 * Path followed from record to record in the detail panel.
 *
 * A badge opens the object it names in place of the panel one was reading. The
 * objects crossed that way form a history, kept in the URL (`peek`) as
 * `kind:id,kind:id…`, with `peekat` giving the one on display. In the URL like the
 * rest of the panel state: a reload or a shared link reopen the same history at the
 * same place, and the browser Back button walks it.
 *
 * Moving back never shortens the history: the cursor moves, every object stays
 * reachable in one click, forward as well as back.
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

/**
 * History after opening an object, and the position it leaves one at.
 *
 * Nothing is ever dropped: going back to an earlier record then following another
 * badge keeps what was visited in between, so one can move back and forth. An object
 * already visited is not repeated either — the cursor simply moves to it — so the
 * bar stays a list of distinct objects.
 */
export function pushStep(trail: PeekStep[], step: PeekStep): { trail: PeekStep[]; index: number } {
  const seen = trail.findIndex((s) => s.kind === step.kind && s.id === step.id);
  if (seen >= 0) return { trail, index: seen };
  return { trail: [...trail, step], index: trail.length };
}

/** Position of the record on display, clamped to what the history holds. */
export function currentIndex(trail: PeekStep[], raw: unknown): number {
  const last = trail.length - 1;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed)) return last;
  return Math.min(Math.max(Math.trunc(parsed), 0), last);
}

/** Views whose rows name an object the panel knows how to show. */
const ROUTE_KINDS: Record<string, string> = {
  "/nodes": "node",
  "/services": "service",
  "/instances": "instance",
  "/apps": "app",
  "/groups": "group",
};

/**
 * The row whose panel is open, when the current view has one: it is the start of the
 * path, so that coming back from a badge returns to the record one was reading.
 */
export function rowStep(pathname: string, sel: unknown): PeekStep | null {
  const kind = ROUTE_KINDS[pathname];
  if (kind === undefined || typeof sel !== "string" || sel === "") return null;
  return { kind, id: sel };
}
