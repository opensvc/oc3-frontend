import { useTranslation } from "react-i18next";
import { useAnyPanelOpen } from "@/components/ui/slide-over-open";
import { HistoryIcon } from "@/components/ui/icons";
import { readLastRecord } from "@/components/opensvc/last-record";
import { useObjectLabels } from "@/components/opensvc/object-label";
import { isPeekStep } from "@/components/opensvc/panel-trail";
import { usePeek } from "@/components/opensvc/use-peek";
import { useRecordHistory } from "@/lib/record-history";

/**
 * Anchor on the right edge of the window while no side panel is open: it brings
 * back the detail panel and its history, on the record shown last, or on the first
 * of the history when that one is no longer listed. Nothing to reopen, no anchor.
 */
export function PanelAnchor() {
  const { t } = useTranslation();
  const anyOpen = useAnyPanelOpen();
  const history = useRecordHistory();
  const peek = usePeek();
  const steps = history.entries.filter(isPeekStep);
  const last = readLastRecord();
  const target = steps.find((step) => step.kind === last?.kind && step.id === last.id) ?? steps[0];
  // Named only when it shows: a closed anchor asks nothing of the API.
  const [name] = useObjectLabels(target === undefined || anyOpen ? [] : [target]);

  if (anyOpen || target === undefined) return null;
  const label = t("panelHistory.reopen", { name: name ?? target.id, count: steps.length });

  return (
    <button
      type="button"
      title={label}
      onClick={() => {
        peek(target.kind, target.id);
      }}
      className="fixed top-14 right-0 z-10 flex items-center gap-1 rounded-l-(--radius-panel) border border-r-0 border-line bg-surface-raised py-1.5 pr-1.5 pl-2 text-ink-muted shadow-lg hover:text-ink"
    >
      <HistoryIcon className="h-4 w-4" />
      <span aria-hidden="true" className="text-data tabular-nums">
        {steps.length}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
