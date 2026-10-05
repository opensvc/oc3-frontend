import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  EMPTY_VALUE,
  canPickWithOthers,
  fromPickedValues,
  invertFilter,
  isInverted,
  toPickedValues,
} from "@/lib/column-filters";
import type { ValueStats } from "@/lib/api/value-stats";
import { Distribution, type DistributionItem } from "@/components/ui/Distribution";
import { DistributionIcon } from "@/components/ui/icons";
import { useAnchoredPlacement } from "@/components/ui/use-anchored-placement";

/** Pause in the typing after which the narrowing is asked. */
const TYPING_DELAY = 300;

/** How a value of the column is named: the label of its option, or the value. */
export interface ValueLabel {
  text: string;
  render?: ReactNode;
}

/**
 * The distribution of the values of a column, opened from its filter: the most
 * frequent values over the selection of the list, every filter but the column's
 * own applied, so that the list shows what the filter could pick rather than
 * what it already keeps. The historical collector drew it as a pie in the filter
 * box; ranked bars read better past a handful of values and need no colour per
 * value.
 *
 * A pick sets the filter of the column at once: a click picks the value alone
 * (`eq:v`, or `empty`), a Ctrl or ⌘ click or Space adds it to the picked ones
 * (`in:a,b`), and clicking the only picked value again clears the filter.
 * "Exclude" inverts the pick (`!in:a,b`). Typing narrows the values to those
 * containing the text, asked again of the server: past the first values of a
 * column holding many, that is how the others are reached.
 *
 * The panel lives in `document.body`, placed under its button, as the list of an
 * enumerated filter; it closes on a click outside, on Escape and when the focus
 * leaves it.
 */
export function ColumnDistribution({
  column,
  expr,
  onChange,
  fetchStats,
  queryKey,
  labelOf,
}: {
  /** Name of the column, as its header shows it. */
  column: string;
  /** Current filter of the column. */
  expr: string | undefined;
  onChange: (expr: string | undefined) => void;
  /** Reads the distribution, narrowed to the values containing `narrow`. */
  fetchStats: (narrow: string | undefined) => Promise<ValueStats>;
  /** Cache key of the distribution: the list, the column and the other filters. */
  queryKey: readonly unknown[];
  labelOf: (value: string) => ValueLabel;
}) {
  const { t, i18n } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [narrow, setNarrow] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useAnchoredPlacement(open, button, panel, { matchWidth: false });

  // Focused once the panel is attached, not by autoFocus: the focus would leave
  // the button before the panel can be told inside, and close it.
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNarrow(typed.trim());
    }, TYPING_DELAY);
    return () => {
      window.clearTimeout(timer);
    };
  }, [typed]);

  const stats = useQuery({
    queryKey: [...queryKey, narrow],
    queryFn: () => fetchStats(narrow === "" ? undefined : narrow),
    enabled: open,
    // Kept while the narrowing changes, not to empty the panel under the field.
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  function inside(node: Node) {
    return root.current?.contains(node) === true || panel.current?.contains(node) === true;
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node) || inside(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const picked = toPickedValues(expr);
  const inverted = isInverted(expr);

  function pick(value: string, add: boolean) {
    if (!add) {
      onChange(
        picked.length === 1 && picked[0] === value && !inverted
          ? undefined
          : fromPickedValues([value]),
      );
      return;
    }
    const next = picked.includes(value)
      ? picked.filter((other) => other !== value)
      : canPickWithOthers(value) && picked.every(canPickWithOthers)
        ? [...picked, value]
        : [value];
    onChange(fromPickedValues(next, inverted));
  }

  const data = stats.data;
  const items: DistributionItem[] = (data?.values ?? []).map(({ value, count }) => {
    const name = valueName(value);
    return { key: value, label: name.node, text: name.text, count, picked: picked.includes(value) };
  });
  // Picked values the panel does not show, past the most frequent: named, to be
  // found again by typing.
  const hidden = data === undefined ? [] : picked.filter((v) => !items.some((i) => i.key === v));
  const leftOut = data === undefined ? 0 : data.distinct - data.values.length;

  function valueName(value: string): { node: ReactNode; text: string } {
    if (value === EMPTY_VALUE) {
      const text = t("list.distribution.empty");
      return { node: <span className="text-ink-muted italic">{text}</span>, text };
    }
    const label = labelOf(value);
    return { node: label.render ?? label.text, text: label.text };
  }

  return (
    <div
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
      onBlur={(event) => {
        // React carries the events of the panel here although it lives in the body.
        if (!(event.relatedTarget instanceof Node) || !inside(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title={t("list.distribution.open", { column })}
        aria-label={t("list.distribution.open", { column })}
        onClick={() => {
          setOpen((previous) => !previous);
        }}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-(--radius-control) border ${
          open ? "border-accent text-ink" : "border-line text-ink-muted hover:text-ink"
        }`}
      >
        <DistributionIcon className="h-3.5 w-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={panelId}
            role="dialog"
            aria-label={t("list.distribution.title", { column })}
            tabIndex={-1}
            className="fixed z-30 flex w-[24rem] max-w-[calc(100vw-1rem)] flex-col gap-2 overflow-y-auto rounded-(--radius-panel) border border-line bg-surface-raised p-2 text-data font-normal shadow-lg outline-none"
          >
            <div className="flex items-baseline justify-between gap-2 px-1.5">
              <h2 className="truncate font-semibold">{column}</h2>
              {data !== undefined && (
                <span className="shrink-0 text-ink-muted" aria-live="polite">
                  {t("list.distribution.summary", {
                    values: data.distinct,
                    rows: data.total,
                    count: data.distinct,
                  })}
                </span>
              )}
            </div>
            <input
              ref={field}
              type="search"
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
              }}
              placeholder={t("list.distribution.narrow")}
              aria-label={t("list.distribution.narrow")}
              className="h-7 rounded-(--radius-control) border border-line bg-surface px-2 text-ink outline-none placeholder:text-ink-muted focus:border-accent"
            />

            {stats.isPending && <p className="px-1.5 text-ink-muted">{t("list.loading")}</p>}
            {stats.isError && (
              <p role="alert" className="px-1.5 text-state-down">
                ■ {stats.error.message}
              </p>
            )}
            {data !== undefined && data.total === 0 && (
              <p className="px-1.5 text-ink-muted">{t("list.distribution.none")}</p>
            )}
            {data !== undefined && items.length > 0 && (
              <>
                {inverted && picked.length > 0 && (
                  <p className="px-1.5 text-state-warn">
                    <span aria-hidden="true">≠ </span>
                    {t("list.distribution.excluding")}
                  </p>
                )}
                <Distribution
                  items={items}
                  total={data.total}
                  label={t("list.distribution.title", { column })}
                  locale={i18n.language}
                  onPick={pick}
                />
                {leftOut > 0 && (
                  <p className="px-1.5 text-ink-muted">
                    {t("list.distribution.other", { count: leftOut, rows: data.other })}
                  </p>
                )}
                {data.distinct === data.total && data.total > 1 && (
                  <p className="px-1.5 text-ink-muted">{t("list.distribution.unique")}</p>
                )}
              </>
            )}
            {hidden.length > 0 && (
              <p className="px-1.5 text-ink-muted">
                {t("list.distribution.alsoPicked", {
                  values: hidden.map((value) => valueName(value).text).join(", "),
                })}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-1.5 pt-2">
              <span className="text-ink-muted">{t("list.distribution.hint")}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={picked.length === 0}
                  aria-pressed={inverted}
                  onClick={() => {
                    if (expr !== undefined) onChange(invertFilter(expr));
                  }}
                  className="h-7 rounded-(--radius-control) border border-line px-2 disabled:opacity-40 aria-pressed:border-accent aria-pressed:bg-accent-soft"
                >
                  <span aria-hidden="true" className="font-mono">
                    ≠{" "}
                  </span>
                  {t("list.distribution.exclude")}
                </button>
                <button
                  type="button"
                  disabled={expr === undefined}
                  onClick={() => {
                    onChange(undefined);
                  }}
                  className="h-7 rounded-(--radius-control) border border-line px-2 disabled:opacity-40"
                >
                  {t("list.distribution.clear")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
