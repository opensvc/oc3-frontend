import { useState } from "react";
import { problemText } from "@/lib/api/problem";

/** A secondary button of the compliance panels. */
export const COMP_BUTTON =
  "inline-flex h-7 items-center gap-1 rounded-(--radius-control) border border-line bg-surface px-2 text-ink-muted hover:border-line-strong hover:text-ink disabled:opacity-40";

/** The outcome of the last change. */
export interface ChangeOutcome {
  tone: "done" | "refused";
  text: string;
}

/** An API call of an editor: what it answers is an error, or nothing. */
export type ChangeCall = () => Promise<{ error?: unknown }>;

/** Runs a change, then tells its outcome; resolves to the refusal, or null. */
export type RunChange = (done: string, call: ChangeCall) => Promise<string | null>;

/**
 * The changes of a panel: one at a time, `busy` meanwhile, the outcome kept for
 * `ChangeOutcomeLine`, and `onChanged` to reload what a change touched.
 */
export function useChanges(onChanged: () => Promise<void>) {
  const [outcome, setOutcome] = useState<ChangeOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const change: RunChange = async (done, call) => {
    setBusy(true);
    try {
      const { error } = await call();
      if (error !== undefined) {
        const message = problemText(error);
        setOutcome({ tone: "refused", text: message });
        return message;
      }
      setOutcome({ tone: "done", text: done });
      await onChanged();
      return null;
    } finally {
      setBusy(false);
    }
  };
  return {
    outcome,
    busy,
    change,
    dismiss: () => {
      setOutcome(null);
    },
  };
}
