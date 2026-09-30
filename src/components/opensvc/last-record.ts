import type { PeekStep } from "@/lib/peek-trail";

/**
 * The record a panel showed last, for the anchor that reopens the panels once
 * closed (`PanelAnchor`). The history cannot tell: a record shown again keeps its
 * place in it. Kept by the browser tab, like the history itself; without it, the
 * anchor opens the first record of the history.
 */

const STORAGE_KEY = "oc3.last-record";

export function rememberLastRecord(step: PeekStep): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ kind: step.kind, id: step.id }));
  } catch {
    // Not kept: the anchor falls back on the first record of the history.
  }
}

export function readLastRecord(): PeekStep | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof raw !== "object" || raw === null) return null;
    const { kind, id } = raw as Record<string, unknown>;
    return typeof kind === "string" && typeof id === "string" ? { kind, id } : null;
  } catch {
    return null;
  }
}
