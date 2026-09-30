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
 * recent first unless the user rearranged them, named, and what opens one, moves
 * one, removes one or clears them all. Opening one leaves it where it stands.
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
      peek(entry.step.kind, entry.step.id);
    },
    remove: (entry: HistoryEntry) => {
      history.remove(entry.step.kind, entry.step.id);
    },
    clear: history.clear,
    /** Moves the entry of index `from` so that it stands at index `to`. */
    move: (from: number, to: number) => {
      if (from === to || from < 0 || from >= entries.length) return;
      const order = entries.map((entry) => entry.step);
      const [moved] = order.splice(from, 1);
      if (moved === undefined) return;
      order.splice(Math.min(Math.max(to, 0), order.length), 0, moved);
      history.reorder(order);
    },
  };
}
