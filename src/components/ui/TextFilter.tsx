import { useEffect, useId, useRef, useState } from "react";
import { fromTextDraft, regexError, toTextDraft, type TextDraft } from "@/lib/column-filters";
import { AlertTriangleIcon, CloseIcon } from "./icons";

/** Pause in the typing after which the filter applies. */
const TYPING_DELAY = 400;

/**
 * Text filter of a column: a substring by default, a regular expression with the
 * `.*` toggle on.
 *
 * `value` is the stored expression (`dev`, `~^dev`, `gte:8`…), `onChange` receives
 * the new one, or undefined to clear the filter. What is typed applies after a short
 * pause, or at once with Enter; the toggle and the clear button apply at once. A
 * regular expression the browser cannot compile is not sent: the field is marked
 * invalid, with an icon and a message beside the red border.
 */
export function TextFilter({
  value,
  onChange,
  label,
  regexLabel,
  clearLabel,
  invalidLabel,
  placeholder,
}: {
  value: string | undefined;
  onChange: (expr: string | undefined) => void;
  /** Accessible name of the field. */
  label: string;
  /** Name of the regular expression toggle. */
  regexLabel: string;
  clearLabel: string;
  /** Message for an invalid regular expression; receives the engine's reason. */
  invalidLabel: (reason: string) => string;
  placeholder?: string;
}) {
  const errorId = useId();
  const [draft, setDraft] = useState<TextDraft>(() => toTextDraft(value));
  // Last value received, and last value sent: a value that changes without having
  // been sent from here (a "clear all", a link) replaces what the field shows.
  const [seen, setSeen] = useState(value);
  const [sent, setSent] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== sent) {
      setSent(value);
      setDraft(toTextDraft(value));
    }
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const expr = fromTextDraft(draft);
  const error = regexError(expr);

  function commit(next: TextDraft) {
    clearTimeout(timer.current);
    const nextExpr = fromTextDraft(next);
    if (regexError(nextExpr) !== null || nextExpr === value) return;
    setSent(nextExpr);
    onChange(nextExpr);
  }

  function edit(next: TextDraft, delay: number) {
    setDraft(next);
    clearTimeout(timer.current);
    if (delay === 0) {
      commit(next);
    } else {
      timer.current = setTimeout(() => {
        commit(next);
      }, delay);
    }
  }

  return (
    <div
      className={`flex h-6 min-w-24 items-center rounded-(--radius-control) border bg-surface font-normal focus-within:border-accent ${
        error === null ? "border-line" : "border-state-down"
      }`}
    >
      <input
        type="text"
        value={draft.text}
        onChange={(event) => {
          edit({ ...draft, text: event.target.value }, TYPING_DELAY);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          }
        }}
        aria-label={label}
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : errorId}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        className={`w-full min-w-0 bg-transparent px-1.5 text-ink outline-none placeholder:text-ink-muted/70 ${
          draft.regex ? "font-mono" : ""
        }`}
      />
      {error !== null && (
        <span title={invalidLabel(error)} className="text-state-down">
          <AlertTriangleIcon className="h-3.5 w-3.5" />
          <span id={errorId} className="sr-only">
            {invalidLabel(error)}
          </span>
        </span>
      )}
      {draft.text !== "" && (
        <button
          type="button"
          onClick={() => {
            edit({ ...draft, text: "" }, 0);
          }}
          aria-label={clearLabel}
          title={clearLabel}
          className="px-0.5 text-ink-muted hover:text-ink"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
      <button
        type="button"
        aria-pressed={draft.regex}
        onClick={() => {
          edit({ ...draft, regex: !draft.regex }, 0);
        }}
        aria-label={regexLabel}
        title={regexLabel}
        className="h-full rounded-r-(--radius-control) border-l border-line px-1 font-mono text-ink-muted hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-ink"
      >
        .*
      </button>
    </div>
  );
}
