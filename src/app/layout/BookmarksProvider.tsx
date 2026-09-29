import type { ReactNode } from "react";
import { ObjectIcon, type ObjectKind } from "@/components/opensvc/ObjectIcon";
import { useObjectLabels } from "@/components/opensvc/object-label";
import { usePeek } from "@/components/opensvc/use-peek";
import { TrailContext, type TrailStep } from "@/components/ui/trail";
import { useBookmarksPref } from "@/lib/user-prefs";

/**
 * The records the user bookmarked, for the bar at the foot of the application and for the Bookmarks menu of the
 * top bar: each record named and iconed, opened over the current view by the record
 * panel (`PeekPanel`), and removable. Provided once, in the application shell, so
 * that it is the same wherever one goes.
 */
export function BookmarksProvider({ children }: { children: ReactNode }) {
  const bookmarks = useBookmarksPref();
  const labels = useObjectLabels(bookmarks.entries);
  const peek = usePeek();
  const steps: TrailStep[] = bookmarks.entries.map((entry, index) => ({
    key: `${entry.kind}:${entry.id}`,
    label: labels[index] ?? entry.id,
    icon: <ObjectIcon kind={entry.kind as ObjectKind} className="h-3.5 w-3.5 shrink-0" />,
    onSelect: () => {
      peek(entry.kind, entry.id);
    },
    onRemove: () => {
      bookmarks.remove(entry.kind, entry.id);
    },
  }));
  return <TrailContext.Provider value={steps}>{children}</TrailContext.Provider>;
}
