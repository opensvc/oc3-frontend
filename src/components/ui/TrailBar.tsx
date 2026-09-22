import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "./icons";
import { useTrail } from "./trail";

const CHIP =
  "inline-flex max-w-44 items-center gap-1 rounded-full border border-line px-1.5 text-data text-ink-muted hover:border-line-strong hover:text-ink";

const ARROW =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-(--radius-control) border border-line text-ink-muted hover:border-line-strong hover:text-ink disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted";

/** Beyond this, the oldest entries fold behind an ellipsis: the bar stays one line. */
const SHOWN = 3;

/**
 * History of the records looked at: one chip per object, the one on display plain
 * among them. Clicking a chip moves to that object, backwards or forwards, and the
 * arrows step one at a time. Nothing is ever dropped, so a record left behind stays
 * one click away.
 *
 * Nothing is shown when a single object has been visited: there is nowhere to go.
 */
export function TrailBar() {
  const { t } = useTranslation();
  const trail = useTrail();
  const [expanded, setExpanded] = useState(false);

  if (trail.length < 2) return null;
  const at = trail.findIndex((step) => step.onSelect === undefined);
  const previous = at > 0 ? trail[at - 1] : undefined;
  const next = at >= 0 && at < trail.length - 1 ? trail[at + 1] : undefined;
  // The oldest entries fold away to keep one line, never the one on display.
  const hidden = expanded ? 0 : Math.min(Math.max(0, trail.length - SHOWN - 1), Math.max(at, 0));
  const shown = trail.slice(hidden);

  return (
    <nav
      aria-label={t("trail.label")}
      className="flex items-center gap-1 border-b border-line px-3 py-1.5"
    >
      <button
        type="button"
        disabled={previous === undefined}
        title={t("trail.back", { name: previous?.label ?? "" })}
        onClick={previous?.onSelect}
        className={ARROW}
      >
        <ChevronDownIcon className="h-3.5 w-3.5 rotate-90" />
        <span className="sr-only">{t("trail.back", { name: previous?.label ?? "" })}</span>
      </button>
      <button
        type="button"
        disabled={next === undefined}
        title={t("trail.forward", { name: next?.label ?? "" })}
        onClick={next?.onSelect}
        className={`${ARROW} mr-1`}
      >
        <ChevronDownIcon className="h-3.5 w-3.5 -rotate-90" />
        <span className="sr-only">{t("trail.forward", { name: next?.label ?? "" })}</span>
      </button>

      <ol className="flex min-w-0 flex-wrap items-center gap-1">
        {hidden > 0 && (
          <li>
            <button
              type="button"
              title={t("trail.showAll", { count: hidden })}
              onClick={() => {
                setExpanded(true);
              }}
              className={CHIP}
            >
              …
            </button>
          </li>
        )}
        {shown.map((step, index) => (
          <li key={step.key} className="flex min-w-0 items-center gap-1">
            {(index > 0 || hidden > 0) && (
              <span aria-hidden="true" className="text-ink-muted/60">
                ›
              </span>
            )}
            {step.onSelect === undefined ? (
              <span
                aria-current="true"
                className="inline-flex max-w-44 items-center gap-1 text-data"
              >
                {step.icon}
                <span className="truncate font-medium">{step.label}</span>
              </span>
            ) : (
              <button type="button" onClick={step.onSelect} className={CHIP}>
                {step.icon}
                <span className="truncate">{step.label}</span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
