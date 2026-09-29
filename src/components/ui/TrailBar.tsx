import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmButton } from "./ConfirmButton";
import { BookmarkIcon, CloseIcon } from "./icons";
import { useTrail } from "./trail";

const CHIP =
  "inline-flex max-w-44 items-center gap-1 rounded-full border border-line py-0.5 pr-1 pl-1.5 text-data";

/** Beyond this, the oldest records fold behind an ellipsis: the bar stays short. */
const SHOWN = 6;

/**
 * The bookmarks, at the foot of the application: one chip per record the user
 * bookmarked, the one on display highlighted among them. Clicking a chip opens that
 * record over the current view, and its cross removes that bookmark; `onClear`
 * removes them all, once confirmed. Nothing is shown while there is no bookmark.
 */
export function TrailBar({ current, onClear }: { current?: string; onClear?: () => void }) {
  const { t } = useTranslation();
  const trail = useTrail();
  const [expanded, setExpanded] = useState(false);

  if (trail.length === 0) return null;
  const hidden = expanded ? 0 : Math.max(0, trail.length - SHOWN);
  const shown = trail.slice(hidden);

  return (
    <nav
      aria-label={t("bookmarks.title")}
      className="flex shrink-0 items-center gap-2 border-t border-line bg-surface-raised px-3 py-1.5"
    >
      {/* The bar is named by its aria-label: the icon only has to be seen. */}
      <span title={t("bookmarks.title")} className="shrink-0 text-ink-muted">
        <BookmarkIcon filled className="h-4 w-4" />
      </span>
      <ol className="flex min-w-0 flex-wrap items-center gap-1">
        {hidden > 0 && (
          <li>
            <button
              type="button"
              title={t("bookmarks.showAll", { count: hidden })}
              onClick={() => {
                setExpanded(true);
              }}
              className={`${CHIP} pr-1.5 text-ink-muted hover:border-line-strong hover:text-ink`}
            >
              …
            </button>
          </li>
        )}
        {shown.map((step) => {
          const onDisplay = step.key === current;
          return (
            <li key={step.key} className="min-w-0">
              <span
                className={`${CHIP} ${onDisplay ? "border-accent bg-accent-soft text-ink" : "text-ink-muted hover:border-line-strong"}`}
              >
                {onDisplay ? (
                  <span aria-current="true" className="inline-flex min-w-0 items-center gap-1">
                    {step.icon}
                    <span className="truncate font-medium">{step.label}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={step.onSelect}
                    title={t("bookmarks.open", { name: step.label })}
                    className="inline-flex min-w-0 items-center gap-1 hover:text-ink"
                  >
                    {step.icon}
                    <span className="truncate">{step.label}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={step.onRemove}
                  title={t("bookmarks.removeEntry", { name: step.label })}
                  className="shrink-0 rounded-full p-0.5 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                >
                  <CloseIcon className="h-3 w-3" />
                  <span className="sr-only">
                    {t("bookmarks.removeEntry", { name: step.label })}
                  </span>
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {onClear !== undefined && (
        // Right after the bookmarks rather than at the far end, which an open panel covers.
        <div className="shrink-0">
          <ConfirmButton
            label={t("bookmarks.clearAll")}
            question={t("bookmarks.clearQuestion", { count: trail.length })}
            confirmLabel={t("bookmarks.clearAll")}
            cancelLabel={t("detail.cancel")}
            pendingLabel={t("bookmarks.clearAll")}
            inline
            onConfirm={onClear}
          />
        </div>
      )}
    </nav>
  );
}
