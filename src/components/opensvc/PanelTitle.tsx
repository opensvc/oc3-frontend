import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PeekStep } from "@/lib/peek-trail";
import { useHistoryPref } from "@/lib/user-prefs";
import { ObjectIcon, type ObjectKind } from "./ObjectIcon";
import { isPeekStep } from "./panel-trail";
import { useObjectLabels } from "./object-label";
import { usePeek } from "./use-peek";
import { moveTitleRow } from "./title-motion";

const PILL = "inline-flex items-center rounded-full border";
const CURRENT = `${PILL} min-w-0 max-w-80 shrink-0 gap-1.5 border-line-strong bg-surface px-2.5 py-0.5 text-title font-semibold`;
const OLDER = `${PILL} min-w-0 max-w-44 shrink gap-1 border-line px-2 py-0.5 text-data text-ink-muted opacity-70 transition-opacity hover:opacity-100 hover:text-ink`;

const stepKey = (step: PeekStep) => `${step.kind}:${step.id}`;

/**
 * The record shown from an older title: it is displayed without being recorded
 * again, so that the history keeps its order.
 */
let selected: string | null = null;

/**
 * Title of a record panel: the record on display as a strong pill, and the
 * records shown before it — the panel history, kept with the account
 * (`useHistoryPref`) — as faded pills, the most recent first, each with the icon
 * of its kind.
 *
 * Every record displayed goes in front of the history, whatever opened it: a list
 * row, a badge, the search, a bookmark. The other titles slide aside
 * (`title-motion.ts`), even when the panel was closed in between. Clicking an older
 * title shows that record without reordering the history.
 */
export function PanelTitle({
  kind,
  title,
  recordId,
  open,
}: {
  kind: ObjectKind;
  title: string;
  recordId: string | undefined;
  open: boolean;
}) {
  const { t } = useTranslation();
  const peek = usePeek();
  const history = useHistoryPref();
  const row = useRef<HTMLDivElement>(null);
  const current: PeekStep | null =
    recordId === undefined || recordId === "" ? null : { kind, id: recordId };
  const currentKey = current === null ? "" : stepKey(current);
  const entries = history.entries.filter(isPeekStep);
  // Until it is recorded — at once, but after this render — the record on display
  // is put in front; a record the history cannot hold stays in front.
  const steps =
    current === null || entries.some((step) => stepKey(step) === currentKey)
      ? entries
      : [current, ...entries];
  const labels = useObjectLabels(steps);

  const record = useRef(history.record);
  record.current = history.record;
  useEffect(() => {
    if (!open || current === null || !isPeekStep(current)) return;
    // Kept until another record is shown: the effect may run twice for one display.
    if (selected === currentKey) return;
    selected = null;
    record.current(current.kind, current.id);
    // current is derived from currentKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentKey]);

  const signature = `${steps.map(stepKey).join(",")}|${currentKey}`;
  useLayoutEffect(() => {
    if (open && row.current !== null) moveTitleRow(row.current, signature);
  }, [open, signature]);

  const pill = (step: PeekStep, index: number) => {
    const key = stepKey(step);
    const icon = isPeekStep(step) ? <ObjectIcon kind={step.kind} className="h-3.5 w-3.5" /> : null;
    if (key === currentKey)
      return (
        <h2 key={key} data-pill={key} className={CURRENT}>
          <ObjectIcon kind={kind} className="h-4 w-4" />
          {/* The panel names its own record best: its title is read with the record. */}
          <span className="truncate">{title}</span>
        </h2>
      );
    const label = labels[index] ?? step.id;
    return (
      <button
        key={key}
        data-pill={key}
        type="button"
        title={t("panelTitle.show", { name: label })}
        onClick={() => {
          selected = key;
          peek(step.kind, step.id);
        }}
        className={OLDER}
      >
        {icon}
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <div
      ref={row}
      role="group"
      aria-label={t("panelTitle.label")}
      className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
    >
      {current === null && (
        <h2 data-pill="" className={CURRENT}>
          <ObjectIcon kind={kind} className="h-4 w-4" />
          <span className="truncate">{title}</span>
        </h2>
      )}
      {steps.map(pill)}
    </div>
  );
}
