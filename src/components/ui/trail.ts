import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/** One step of the path shown by the panel breadcrumb. */
export interface TrailStep {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Absent for the step on display, which is not a link. */
  onSelect?: () => void;
}

/**
 * Path leading to the record on display, provided by whoever opens the panels.
 *
 * Through a context rather than a prop: `SlideOver` is used by a dozen panels, which
 * have nothing to say about how one arrived at them.
 */
export const TrailContext = createContext<TrailStep[]>([]);

export function useTrail(): TrailStep[] {
  return useContext(TrailContext);
}
