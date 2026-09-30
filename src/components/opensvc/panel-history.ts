import type { PeekStep } from "@/lib/peek-trail";
import { useHistoryPref } from "@/lib/user-prefs";
import type { ObjectKind } from "./ObjectIcon";
import { isPeekStep } from "./panel-trail";
import { useObjectLabels } from "./object-label";
import { usePeek } from "./use-peek";

export const stepKey = (step: PeekStep) => `${step.kind}:${step.id}`;

/** The key of the record a panel shows, as the history names it; empty without an id. */
export function recordKey(kind: string, recordId: string | undefined): string {
  return recordId === undefined || recordId === "" ? "" : stepKey({ kind, id: recordId });
}

/**
 * The record shown from the history: it is displayed without being recorded again,
 * so that the history keeps its order. Kept until another record is shown, the
 * effect that records may run twice for one display.
 */
let selected: string | null = null;

/** True when the record on display was opened from the history; forgets it otherwise. */
export function shownFromHistory(key: string): boolean {
  if (selected === key) return true;
  selected = null;
  return false;
}

/** An entry of the history, as the rail and the menu show it. */
export interface HistoryEntry {
  key: string;
  step: PeekStep & { kind: ObjectKind };
  label: string;
  /** The record the panel displays. */
  current: boolean;
}

/**
 * The panel history, ready to be shown: the records displayed before, the most
 * recent first, named, and what opens one, removes one or clears them all.
 * Opening one shows it without moving it in the history.
 */
export function usePanelHistory(currentKey: string) {
  const history = useHistoryPref();
  const peek = usePeek();
  const steps = history.entries.filter(isPeekStep);
  const labels = useObjectLabels(steps);
  const entries: HistoryEntry[] = steps.map((step, index) => ({
    key: stepKey(step),
    step,
    label: labels[index] ?? step.id,
    current: stepKey(step) === currentKey,
  }));
  return {
    entries,
    collapsed: history.collapsed,
    setCollapsed: history.setCollapsed,
    open: (entry: HistoryEntry) => {
      selected = entry.key;
      peek(entry.step.kind, entry.step.id);
    },
    remove: (entry: HistoryEntry) => {
      history.remove(entry.step.kind, entry.step.id);
    },
    clear: history.clear,
  };
}
