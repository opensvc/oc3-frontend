import { useTranslation } from "react-i18next";
import { BookmarkIcon } from "@/components/ui/icons";
import { useBookmarksPref } from "@/lib/user-prefs";

/**
 * The dedicated button that bookmarks the record on display, or removes its
 * bookmark: the only way to bookmark a record, nothing being added on its own.
 */
export function BookmarkButton({ kind, id }: { kind: string; id: string }) {
  const { t } = useTranslation();
  const bookmarks = useBookmarksPref();
  const kept = bookmarks.has(kind, id);
  const label = t(kept ? "bookmarks.remove" : "bookmarks.add");
  return (
    <button
      type="button"
      aria-pressed={kept}
      title={label}
      onClick={() => {
        if (kept) bookmarks.remove(kind, id);
        else bookmarks.add(kind, id);
      }}
      className="flex h-7 items-center gap-1 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-ink"
    >
      <BookmarkIcon filled={kept} className="h-3.5 w-3.5" />
      <span>{t(kept ? "bookmarks.kept" : "bookmarks.keep")}</span>
    </button>
  );
}
