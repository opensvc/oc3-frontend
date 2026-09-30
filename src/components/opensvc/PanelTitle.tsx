import { useEffect, useRef } from "react";
import type { PeekStep } from "@/lib/peek-trail";
import { useHistoryPref } from "@/lib/user-prefs";
import { RAIL_FALLBACK, type SlideOverSize } from "@/components/ui/slide-over-layout";
import { ObjectIcon, type ObjectKind } from "./ObjectIcon";
import { PanelHistoryMenu } from "./PanelHistory";
import { recordKey, shownFromHistory } from "./panel-history";
import { isPeekStep } from "./panel-trail";

/**
 * Title of a record panel: the icon of its kind and its name, the header's alone.
 * The records shown before — the panel history, kept with the account — hang in a
 * rail beside the panel (`PanelHistoryRail`); where the window leaves it no room,
 * a button next to the title opens them as a list.
 *
 * The title also records the record it shows in the history, whatever opened it —
 * a list row, a badge, the search, a bookmark — except from the history itself,
 * which keeps its order.
 */
export function PanelTitle({
  kind,
  title,
  recordId,
  open,
  size = "default",
}: {
  kind: ObjectKind;
  title: string;
  recordId: string | undefined;
  open: boolean;
  /** Size of the panel: decides where the rail gives way to the list button. */
  size?: SlideOverSize;
}) {
  const history = useHistoryPref();
  const currentKey = recordKey(kind, recordId);
  const current: PeekStep | null =
    recordId === undefined || recordId === "" ? null : { kind, id: recordId };

  const record = useRef(history.record);
  record.current = history.record;
  useEffect(() => {
    if (!open || current === null || !isPeekStep(current)) return;
    if (shownFromHistory(currentKey)) return;
    record.current(current.kind, current.id);
    // current is derived from currentKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentKey]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <ObjectIcon kind={kind} />
      <h2 className="truncate text-title font-semibold">{title}</h2>
      {open && (
        <div className={RAIL_FALLBACK[size]}>
          <PanelHistoryMenu currentKey={currentKey} />
        </div>
      )}
    </div>
  );
}
