import { createContext, useContext } from "react";
import type { PeekStep } from "@/lib/peek-trail";
import type { ObjectKind } from "./ObjectIcon";

/**
 * The records opened in the panel over the current view (`PeekPanel`), the most
 * recent first, and the one on display. Provided by `PeekPanel` around its panel
 * only: a list, the search or the bookmarks bar see none.
 */
export interface PanelTrail {
  steps: PeekStep[];
  at: number;
  /** Shows another record of the list, without reordering it. */
  select: (index: number) => void;
}

export const PanelTrailContext = createContext<PanelTrail | null>(null);

/**
 * The record a panel shows, provided by the panel to its content: a badge inside it
 * opens its object as a step further from this record (see `usePeek`), and the
 * panel title starts from it when the panel was opened from a list row.
 */
export const PanelRecordContext = createContext<PeekStep | null>(null);

export function usePanelTrail(): PanelTrail | null {
  return useContext(PanelTrailContext);
}

export function usePanelRecord(): PeekStep | null {
  return useContext(PanelRecordContext);
}

/** The kinds `PeekPanel` can open: a step of another kind, from a hand-written URL, is dropped. */
const PEEK_KINDS: ReadonlySet<string> = new Set<ObjectKind>([
  "node",
  "service",
  "instance",
  "app",
  "group",
  "user",
  "disk",
  "network",
  "tag",
  "filterset",
  "form",
]);

export function isPeekStep(step: PeekStep): step is PeekStep & { kind: ObjectKind } {
  return PEEK_KINDS.has(step.kind);
}
