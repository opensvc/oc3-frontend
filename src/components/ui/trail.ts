import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/** One bookmarked record, shown at the foot of the application. */
export interface TrailStep {
  /** Names the record, as the panel showing it names itself (`trailKey`). */
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  onRemove: () => void;
}

/**
 * The records the user kept, provided once for the whole application.
 *
 * Through a context rather than a prop: `SlideOver` is used by a dozen panels, which
 * have nothing to say about the bookmarks.
 */
export const TrailContext = createContext<TrailStep[]>([]);

export function useTrail(): TrailStep[] {
  return useContext(TrailContext);
}
