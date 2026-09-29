import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { BookmarkIcon, CloseIcon } from "@/components/ui/icons";
import { useTrail } from "@/components/ui/trail";
import { useBookmarksPref } from "@/lib/user-prefs";

/**
 * The bookmarks in the top bar, reachable from any view: the records bookmarked, most
 * recent first, each opening its record over the current view, each removable, and
 * all of them cleared at once. Records get in through the bookmark button of their
 * panel, never on their own.
 */
export function BookmarksMenu() {
  const { t } = useTranslation();
  const steps = useTrail();
  const bookmarks = useBookmarksPref();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target) === true) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const recent = [...steps].reverse();
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 rounded-(--radius-control) border border-line px-2 py-1 text-ink-muted hover:text-ink"
      >
        <BookmarkIcon filled className="h-3.5 w-3.5" />
        {t("bookmarks.title")}
        {steps.length > 0 && (
          <span className="rounded-full bg-accent-soft px-1.5 text-data text-ink">
            {steps.length}
          </span>
        )}
      </button>
      {open && (
        <div
          id={listId}
          className="absolute top-full right-0 z-30 mt-1 w-80 rounded-(--radius-panel) border border-line bg-surface-raised p-2 shadow-lg"
        >
          {recent.length === 0 ? (
            <p className="p-2 text-ink-muted">{t("bookmarks.empty")}</p>
          ) : (
            <>
              <ul className="max-h-96 overflow-y-auto">
                {recent.map((step) => (
                  <li key={step.key} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        step.onSelect();
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-(--radius-control) px-2 py-1.5 text-left hover:bg-surface-sunken"
                    >
                      {step.icon}
                      <span className="truncate">{step.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={step.onRemove}
                      title={t("bookmarks.removeEntry", { name: step.label })}
                      className="shrink-0 rounded-(--radius-control) p-1 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                      <span className="sr-only">
                        {t("bookmarks.removeEntry", { name: step.label })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-t border-line pt-2">
                <ConfirmButton
                  label={t("bookmarks.clearAll")}
                  question={t("bookmarks.clearQuestion", { count: recent.length })}
                  confirmLabel={t("bookmarks.clearAll")}
                  cancelLabel={t("detail.cancel")}
                  pendingLabel={t("bookmarks.clearAll")}
                  onConfirm={bookmarks.clear}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
