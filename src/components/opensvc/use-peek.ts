import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { parseTrail, pushStep, rowStep, serialiseTrail } from "@/lib/peek-trail";

/**
 * Opens the record of an object in the detail panel, in place of the one on display,
 * and adds it to the panel history (see `PeekPanel`). Shared by every badge that
 * names an object, so that they all behave alike.
 */
export function usePeek() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const search = useSearch({ strict: false }) as Record<string, unknown>;

  return (kind: string, id: string) => {
    // The record one was reading becomes the previous entry, so that the history
    // leads back to it; nothing already visited is dropped.
    const started = parseTrail(search.peek);
    const root = rowStep(pathname, search.sel);
    const from = started.length > 0 ? started : root === null ? [] : [root];
    const { trail, index } = pushStep(from, { kind, id });
    void navigate({
      to: ".",
      search: (previous) => ({
        ...(previous as Record<string, unknown>),
        sel: undefined,
        tab: undefined,
        peek: serialiseTrail(trail),
        peekat: index,
        peektab: undefined,
      }),
      resetScroll: false,
    });
  };
}
