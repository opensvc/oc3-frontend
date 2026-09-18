import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TagRow } from "@/features/tags/tag-row";
import { ColumnFamilyIcon } from "./ColumnFamily";

/**
 * Tags d'un objet (node, service), en tête de ses propriétés : quelques mots qui
 * disent à quoi l'objet sert ou ce qui lui est promis. Chaque tag mène à sa fiche
 * dans la vue Tags ; ses données et son motif d'exclusion sont en infobulle.
 */
export function ObjectTags({
  tags,
  isPending,
  errorMessage,
}: {
  tags: TagRow[] | undefined;
  isPending: boolean;
  errorMessage: string | null;
}) {
  const { t } = useTranslation();
  return (
    <section className="mb-4">
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-ink-muted">
        <ColumnFamilyIcon family="app" />
        {t("objectTags.title")}
        {tags !== undefined && <span className="font-normal tabular-nums">({tags.length})</span>}
      </h3>
      {isPending ? (
        <p className="text-ink-muted">{t("detail.loading")}</p>
      ) : errorMessage !== null ? (
        <p role="alert" className="text-state-down">
          ■ {t("detail.error", { message: errorMessage })}
        </p>
      ) : tags === undefined || tags.length === 0 ? (
        <p className="text-ink-muted">{t("objectTags.none")}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("objectTags.title")}>
          {tags.map((tag) => {
            const details = [
              tag.tag_data === "" ? "" : t("objectTags.data", { data: tag.tag_data }),
              tag.tag_exclude === "" ? "" : t("objectTags.exclude", { pattern: tag.tag_exclude }),
            ].filter((line) => line !== "");
            return (
              <li key={tag.tag_id || tag.tag_name}>
                <Link
                  to="/tags"
                  search={{ sel: tag.tag_id }}
                  title={details.length === 0 ? t("objectTags.open") : details.join("\n")}
                  className="inline-flex items-center rounded-full border border-line bg-surface px-2 py-0.5 text-data hover:border-line-strong hover:text-ink"
                >
                  {tag.tag_name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
