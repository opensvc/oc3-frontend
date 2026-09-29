import { useNavigate } from "@tanstack/react-router";
import { serialiseTrail } from "@/lib/peek-trail";

/**
 * Opens the record of an object in the detail panel, over whatever view is on
 * display (see `PeekPanel`). Shared by every badge that names an object and by the
 * bookmarks, so that they all behave alike. Nothing is bookmarked: only the bookmark
 * button of a panel does that.
 */
export function usePeek() {
  const navigate = useNavigate();
  return (kind: string, id: string) => {
    void navigate({
      to: ".",
      search: (previous) => ({
        ...(previous as Record<string, unknown>),
        sel: undefined,
        tab: undefined,
        peek: serialiseTrail([{ kind, id }]),
        peekat: undefined,
        peektab: undefined,
      }),
      resetScroll: false,
    });
  };
}
