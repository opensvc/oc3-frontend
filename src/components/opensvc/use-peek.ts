import { useNavigate } from "@tanstack/react-router";
import { drillTrail, sameStep, serialiseTrail, type PeekStep } from "@/lib/peek-trail";
import { usePanelRecord, usePanelTrail } from "./panel-trail";
import { captureTitlePositions } from "./title-motion";

/**
 * Opens the record of an object in the detail panel, over whatever view is on
 * display (see `PeekPanel`). Shared by every badge that names an object, by the
 * bookmarks and by the global search, so that they all behave alike.
 *
 * From inside a panel, the object is opened as a step further: it goes in front of
 * the records already opened there — or of the record of the row panel it was
 * opened from — which stay in the panel title. From anywhere else, it opens alone.
 * Nothing is bookmarked: only the bookmark button of a panel does that.
 */
export function usePeek() {
  const navigate = useNavigate();
  const trail = usePanelTrail();
  const record = usePanelRecord();
  return (kind: string, id: string) => {
    const next: PeekStep = { kind, id };
    const from: PeekStep[] =
      trail !== null && trail.steps.length > 0 ? trail.steps : record !== null ? [record] : [];
    const shown = trail !== null && trail.steps.length > 0 ? trail.steps[trail.at] : record;
    // The badge of the record on display, in its own panel: nothing to open.
    if (shown !== null && shown !== undefined && sameStep(shown, next)) return;
    const steps = drillTrail(from, next);
    // The titles move from where they are now to their new place.
    if (from.length > 0) captureTitlePositions();
    void navigate({
      to: ".",
      search: (previous) => ({
        ...(previous as Record<string, unknown>),
        sel: undefined,
        tab: undefined,
        peek: serialiseTrail(steps),
        peekat: undefined,
        peektab: undefined,
      }),
      resetScroll: false,
    });
  };
}
