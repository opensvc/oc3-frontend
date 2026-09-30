import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CaretRightIcon, CloseIcon, HistoryIcon, TrashIcon } from "@/components/ui/icons";
import { ObjectIcon } from "./ObjectIcon";
import { moveHistoryEntries } from "./history-motion";
import { usePanelHistory, type HistoryEntry } from "./panel-history";

const RAIL_BUTTON =
  "flex h-7 w-full items-center justify-center rounded-(--radius-control) text-ink-muted hover:bg-surface-sunken hover:text-ink";

/**
 * The panel history as a rail hanging outside the left edge of the panel: one
 * entry per record shown before, the most recent on top, each with the icon of its
 * kind and its name under it; the record on display is highlighted where it stands.
 * Clicking an entry shows its record without reordering; its cross removes it, the
 * bin clears them all. A record newly shown comes in on top, the others sliding
 * down (`history-motion.ts`). The handle folds the rail to a tab, a choice kept with
 * the account. Nothing is rendered while the history is empty.
 */
export function PanelHistoryRail({ currentKey }: { currentKey: string }) {
  const { t } = useTranslation();
  const history = usePanelHistory(currentKey);
  const list = useRef<HTMLOListElement>(null);
  const signature = history.entries.map((entry) => entry.key).join(",");

  useLayoutEffect(() => {
    if (list.current !== null) moveHistoryEntries(list.current, signature);
  }, [signature, history.collapsed]);

  if (history.entries.length === 0) return null;

  if (history.collapsed)
    return (
      <nav
        aria-label={t("panelHistory.label")}
        className="rounded-l-(--radius-panel) border border-r-0 border-line bg-surface-raised p-1 shadow-lg"
      >
        <button
          type="button"
          title={t("panelHistory.expand", { count: history.entries.length })}
          onClick={() => {
            history.setCollapsed(false);
          }}
          className={`${RAIL_BUTTON} w-7 flex-col`}
        >
          <HistoryIcon className="h-4 w-4" />
          <span className="sr-only">
            {t("panelHistory.expand", { count: history.entries.length })}
          </span>
        </button>
      </nav>
    );

  return (
    <nav
      aria-label={t("panelHistory.label")}
      className="flex w-[4.75rem] flex-col gap-1 rounded-l-(--radius-panel) border border-r-0 border-line bg-surface-raised p-1 shadow-lg"
    >
      <button
        type="button"
        title={t("panelHistory.collapse")}
        onClick={() => {
          history.setCollapsed(true);
        }}
        className={RAIL_BUTTON}
      >
        <HistoryIcon className="h-3.5 w-3.5" />
        <CaretRightIcon className="h-3 w-3" />
        <span className="sr-only">{t("panelHistory.collapse")}</span>
      </button>
      <ol ref={list} className="relative flex flex-col gap-1">
        {history.entries.map((entry) => (
          <li key={entry.key} data-entry={entry.key} className="group relative">
            <EntryButton
              entry={entry}
              onOpen={() => {
                history.open(entry);
              }}
              // Two lines at most, cut anywhere: names are often a single long word.
              nameClassName="line-clamp-2 w-full text-center wrap-anywhere"
              className={`flex w-full flex-col items-center gap-0.5 rounded-(--radius-control) border px-0.5 py-1 text-[0.6875rem] leading-tight ${
                entry.current
                  ? "border-accent bg-accent-soft font-medium text-ink"
                  : "border-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink"
              }`}
            />
            <button
              type="button"
              title={t("panelHistory.remove", { name: entry.label })}
              onClick={() => {
                history.remove(entry);
              }}
              // Invisible at rest but present and focusable, for the keyboard.
              className="absolute top-0 right-0 rounded-full bg-surface-raised p-0.5 text-ink-muted opacity-0 group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
            >
              <CloseIcon className="h-3 w-3" />
              <span className="sr-only">{t("panelHistory.remove", { name: entry.label })}</span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        title={t("panelHistory.clear")}
        onClick={history.clear}
        className={`${RAIL_BUTTON} border-t border-line`}
      >
        <TrashIcon className="h-3.5 w-3.5" />
        <span className="sr-only">{t("panelHistory.clear")}</span>
      </button>
    </nav>
  );
}

/**
 * The panel history as a button of the header opening a list, where the window
 * leaves no room for the rail beside the panel. Same entries and same actions.
 */
export function PanelHistoryMenu({ currentKey }: { currentKey: string }) {
  const { t } = useTranslation();
  const history = usePanelHistory(currentKey);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target) === false)
        setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (history.entries.length === 0) return null;
  const label = t("panelHistory.menu", { count: history.entries.length });

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(event) => {
        // The panel listens for Escape at the document level: without this, closing
        // the list would close the panel too.
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        title={label}
        onClick={() => {
          setOpen((previous) => !previous);
        }}
        className="flex h-7 items-center gap-1 rounded-(--radius-control) border border-line px-1.5 text-ink-muted hover:text-ink"
      >
        <HistoryIcon className="h-4 w-4" />
        <span aria-hidden="true" className="text-data tabular-nums">
          {history.entries.length}
        </span>
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-(--radius-panel) border border-line bg-surface-raised p-1 shadow-lg">
          <ol className="flex flex-col">
            {history.entries.map((entry) => (
              <li key={entry.key} className="flex items-center gap-1">
                <EntryButton
                  entry={entry}
                  onOpen={() => {
                    setOpen(false);
                    history.open(entry);
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-(--radius-control) px-2 py-1 text-left ${
                    entry.current ? "bg-accent-soft font-medium" : "hover:bg-surface-sunken"
                  }`}
                />
                <button
                  type="button"
                  title={t("panelHistory.remove", { name: entry.label })}
                  onClick={() => {
                    history.remove(entry);
                  }}
                  className="shrink-0 rounded-full p-1 text-ink-muted hover:text-ink"
                >
                  <CloseIcon className="h-3 w-3" />
                  <span className="sr-only">{t("panelHistory.remove", { name: entry.label })}</span>
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              history.clear();
            }}
            className="mt-1 flex w-full items-center gap-2 border-t border-line px-2 py-1 text-ink-muted hover:text-ink"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {t("panelHistory.clear")}
          </button>
        </div>
      )}
    </div>
  );
}

/** An entry: the icon of its kind and its name; the one on display is not a link. */
function EntryButton({
  entry,
  onOpen,
  className,
  nameClassName = "w-full min-w-0 truncate",
}: {
  entry: HistoryEntry;
  onOpen: () => void;
  className: string;
  nameClassName?: string;
}) {
  const { t } = useTranslation();
  const content = (
    <>
      <ObjectIcon kind={entry.step.kind} className="h-4 w-4" />
      <span className={nameClassName}>{entry.label}</span>
    </>
  );
  // The record on display: said so, and nothing to open.
  if (entry.current)
    return (
      <span aria-current="true" title={entry.label} className={className}>
        {content}
      </span>
    );
  return (
    <button
      type="button"
      title={t("panelHistory.show", { name: entry.label })}
      onClick={onOpen}
      className={className}
    >
      {content}
    </button>
  );
}
