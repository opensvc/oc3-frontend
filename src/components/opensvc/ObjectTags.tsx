import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TagRow } from "@/features/tags/tag-row";
import { PlusIcon } from "@/components/ui/icons";
import { ColumnFamilyIcon } from "./ColumnFamily";

const CONTROL = "h-7 rounded-(--radius-control) border border-line bg-surface px-1";

/** Sélecteur de rattachement, tenu par l'appelant (voir `useTagAttach`). */
export interface TagAttachControl {
  /** Faux tant que le droit de rattacher n'est pas établi : le bouton reste masqué. */
  allowed: boolean;
  picking: boolean;
  setPicking: (picking: boolean) => void;
  /** Tags rattachables, chargés à l'ouverture du sélecteur. */
  candidates: TagRow[] | undefined;
  candidatesPending: boolean;
  candidatesError: string | null;
  attach: (tagId: string) => void;
  attaching: boolean;
  attachError: string | null;
}

/**
 * Tags d'un objet (node, service), en tête de ses propriétés : quelques mots qui
 * disent à quoi l'objet sert ou ce qui lui est promis. Chaque tag mène à sa fiche
 * dans la vue Tags ; ses données et son motif d'exclusion sont en infobulle.
 *
 * Avec `attach`, et pour qui en a le droit, un bouton ouvre un sélecteur des tags encore rattachables. Il
 * reste ouvert après un rattachement, pour en enchaîner plusieurs.
 */
export function ObjectTags({
  tags,
  isPending,
  errorMessage,
  attach,
}: {
  tags: TagRow[] | undefined;
  isPending: boolean;
  errorMessage: string | null;
  attach?: TagAttachControl;
}) {
  const { t } = useTranslation();
  return (
    <section className="mb-4">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-ink-muted">
          <ColumnFamilyIcon family="app" />
          {t("objectTags.title")}
          {tags !== undefined && <span className="font-normal tabular-nums">({tags.length})</span>}
        </h3>
        {attach?.allowed === true && !attach.picking && (
          <button
            type="button"
            onClick={() => {
              attach.setPicking(true);
            }}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:border-line-strong hover:text-ink"
          >
            <PlusIcon />
            {t("objectTags.attach.open")}
          </button>
        )}
      </div>
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
                  className="inline-flex items-center rounded-full bg-tag px-2 py-0.5 text-data font-medium text-tag-ink hover:bg-tag-hover"
                >
                  {tag.tag_name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {attach?.picking === true && <AttachForm attach={attach} />}
    </section>
  );
}

function AttachForm({ attach }: { attach: TagAttachControl }) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState("");
  const candidates = attach.candidates ?? [];
  // Un tag qui vient d'être rattaché sort de la liste : la sélection retombe à vide.
  const selected = candidates.some((tag) => tag.tag_id === choice) ? choice : "";

  return (
    <div className="mt-2">
      {attach.candidatesPending ? (
        <p className="text-ink-muted">{t("detail.loading")}</p>
      ) : attach.candidatesError !== null ? (
        <p role="alert" className="text-state-down">
          ■ {t("detail.error", { message: attach.candidatesError })}
        </p>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (selected !== "") attach.attach(selected);
          }}
        >
          {candidates.length === 0 ? (
            <p className="text-ink-muted">{t("objectTags.attach.noCandidate")}</p>
          ) : (
            <>
              <select
                aria-label={t("objectTags.attach.choose")}
                value={selected}
                disabled={attach.attaching}
                onChange={(event) => {
                  setChoice(event.target.value);
                }}
                className={`${CONTROL} min-w-0 flex-1`}
              >
                <option value="">{t("objectTags.attach.placeholder")}</option>
                {candidates.map((tag) => (
                  <option key={tag.tag_id} value={tag.tag_id}>
                    {tag.tag_name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={attach.attaching || selected === ""}
                className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
              >
                {attach.attaching ? t("objectTags.attach.pending") : t("objectTags.attach.submit")}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              attach.setPicking(false);
            }}
            className="h-7 rounded-(--radius-control) border border-line px-3 text-ink-muted hover:text-ink"
          >
            {t("objectTags.attach.close")}
          </button>
        </form>
      )}
      {attach.attachError !== null && (
        <p role="alert" className="mt-2 text-state-down">
          ■ {attach.attachError}
        </p>
      )}
    </div>
  );
}
