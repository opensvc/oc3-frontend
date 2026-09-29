import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PeekStep } from "@/lib/peek-trail";
import { ObjectIcon, type ObjectKind } from "./ObjectIcon";
import { isPeekStep, usePanelTrail } from "./panel-trail";
import { useObjectLabels } from "./object-label";
import { playTitleMotion, registerTitleRow, unregisterTitleRow } from "./title-motion";

const PILL = "inline-flex items-center rounded-full border";
const CURRENT = `${PILL} min-w-0 max-w-80 shrink-0 gap-1.5 border-line-strong bg-surface px-2.5 py-0.5 text-title font-semibold`;
const OLDER = `${PILL} min-w-0 max-w-44 shrink gap-1 border-line px-2 py-0.5 text-data text-ink-muted opacity-70 transition-opacity hover:opacity-100 hover:text-ink`;

/**
 * Title of a record panel: the record on display as a strong pill, then the
 * records opened before it in the panel, faded, the most recent first — each with
 * the icon of its kind. Clicking an older one shows it without reordering the list
 * (`PanelTrail.select`); opening a record from inside the panel puts it in front,
 * the others sliding aside (see `title-motion.ts`).
 *
 * A panel opened from a list row has no such list: its title is its record alone.
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
  const trail = usePanelTrail();
  const row = useRef<HTMLDivElement>(null);
  const inTrail = trail !== null && trail.steps.length > 0;
  const steps: PeekStep[] = inTrail
    ? trail.steps
    : recordId === undefined || recordId === ""
      ? []
      : [{ kind, id: recordId }];
  const at = inTrail ? trail.at : 0;
  const labels = useObjectLabels(steps);
  const order = steps.map((step) => `${step.kind}:${step.id}`).join(",");

  useLayoutEffect(() => {
    const element = row.current;
    if (element === null || !open) return;
    registerTitleRow(element);
    playTitleMotion(element);
    return () => {
      unregisterTitleRow(element);
    };
  }, [open, order]);

  return (
    <div
      ref={row}
      role="group"
      aria-label={t("panelTitle.label")}
      className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
    >
      {steps.length === 0 ? (
        <h2 className={CURRENT}>
          <ObjectIcon kind={kind} className="h-4 w-4" />
          <span className="truncate">{title}</span>
        </h2>
      ) : (
        steps.map((step, index) => {
          const key = `${step.kind}:${step.id}`;
          // The panel names its own record best: its title is read with the record.
          const label = index === at ? title : (labels[index] ?? step.id);
          const icon = isPeekStep(step) ? (
            <ObjectIcon kind={step.kind} className={index === at ? "h-4 w-4" : "h-3.5 w-3.5"} />
          ) : null;
          return index === at ? (
            <h2 key={key} data-pill={key} className={CURRENT}>
              {icon}
              <span className="truncate">{label}</span>
            </h2>
          ) : (
            <button
              key={key}
              data-pill={key}
              type="button"
              title={t("panelTitle.show", { name: label })}
              onClick={() => {
                trail?.select(index);
              }}
              className={OLDER}
            >
              {icon}
              <span className="truncate">{label}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
