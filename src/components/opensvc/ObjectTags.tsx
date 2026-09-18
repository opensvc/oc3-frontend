import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TagRow } from "@/features/tags/tag-row";
import { Combobox } from "@/components/ui/Combobox";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { ColumnFamilyIcon } from "./ColumnFamily";

/** Rattachement et détachement, tenus par l'appelant (voir `useTagEdit`). */
export interface TagEditControl {
  /** Faux tant que le droit de modifier n'est pas établi : les boutons restent masqués. */
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
  /** `tag_id` du tag dont le détachement attend confirmation. */
  confirmingDetach: string | null;
  /** Demande confirmation pour ce tag, ou l'abandonne avec `null`. */
  askDetach: (tagId: string | null) => void;
  detach: (tagId: string) => void;
  /** `tag_id` du tag en cours de détachement. */
  detaching: string | null;
  detachError: string | null;
}

/**
 * Tags d'un objet (node, service), en tête de ses propriétés : quelques mots qui
 * disent à quoi l'objet sert ou ce qui lui est promis. Chaque tag mène à sa fiche
 * dans la vue Tags ; ses données et son motif d'exclusion sont en infobulle.
 *
 * Avec `edit`, et pour qui en a le droit, chaque puce porte une croix qui détache
 * le tag après confirmation, et un bouton ouvre un sélecteur des tags encore
 * rattachables, filtrable à la saisie. Le sélecteur reste ouvert après un rattachement, pour en enchaîner plusieurs.
 */
export function ObjectTags({
  tags,
  isPending,
  errorMessage,
  edit,
}: {
  tags: TagRow[] | undefined;
  isPending: boolean;
  errorMessage: string | null;
  edit?: TagEditControl;
}) {
  const { t } = useTranslation();
  const editable = edit?.allowed === true;
  const section = useRef<HTMLElement>(null);
  const confirming =
    edit === undefined ? undefined : tags?.find((tag) => tag.tag_id === edit.confirmingDetach);
  return (
    <section ref={section} className="mb-4">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-ink-muted">
          <ColumnFamilyIcon family="app" />
          {t("objectTags.title")}
          {tags !== undefined && <span className="font-normal tabular-nums">({tags.length})</span>}
        </h3>
        {editable && !edit.picking && (
          <button
            type="button"
            onClick={() => {
              edit.setPicking(true);
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
            const detaching = edit?.detaching === tag.tag_id;
            return (
              <li
                key={tag.tag_id || tag.tag_name}
                className={`inline-flex items-stretch overflow-hidden rounded-full bg-tag text-data font-medium text-tag-ink ${detaching ? "opacity-60" : ""}`}
              >
                <Link
                  to="/tags"
                  search={{ sel: tag.tag_id }}
                  title={details.length === 0 ? t("objectTags.open") : details.join("\n")}
                  className={`inline-flex items-center py-0.5 hover:bg-tag-hover ${editable ? "pr-1.5 pl-2" : "px-2"}`}
                >
                  {tag.tag_name}
                </Link>
                {editable && (
                  <button
                    type="button"
                    data-detach={tag.tag_id}
                    disabled={edit.detaching !== null}
                    aria-expanded={edit.confirmingDetach === tag.tag_id}
                    aria-label={t("objectTags.detach.label", { name: tag.tag_name })}
                    title={t("objectTags.detach.label", { name: tag.tag_name })}
                    onClick={() => {
                      edit.askDetach(tag.tag_id);
                    }}
                    className="inline-flex items-center border-l border-tag-ink/30 pr-1.5 pl-1 hover:bg-tag-hover disabled:cursor-wait"
                  >
                    <CloseIcon width={10} height={10} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {edit !== undefined && confirming !== undefined && (
        <DetachConfirm
          name={confirming.tag_name}
          onConfirm={() => {
            edit.detach(confirming.tag_id);
          }}
          onCancel={() => {
            edit.askDetach(null);
            // Le focus revient sur la croix qui a ouvert la question.
            section.current
              ?.querySelector<HTMLButtonElement>(`[data-detach="${CSS.escape(confirming.tag_id)}"]`)
              ?.focus();
          }}
        />
      )}
      {edit?.detachError != null && (
        <p role="alert" className="mt-2 text-state-down">
          ■ {edit.detachError}
        </p>
      )}
      {edit?.picking === true && <AttachForm attach={edit} />}
    </section>
  );
}

/**
 * Question posée sous les puces, sur le modèle de `ConfirmButton` : le bouton de
 * confirmation prend le focus, ce qui énonce la question aux lecteurs d'écran, et
 * Échap l'abandonne.
 */
function DetachConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const confirm = useRef<HTMLButtonElement>(null);
  const question = t("objectTags.detach.question", { name });

  useEffect(() => {
    confirm.current?.focus();
  }, [name]);

  return (
    <div
      role="group"
      aria-label={question}
      className="mt-2 flex flex-wrap items-center gap-2"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <p>{question}</p>
      <button
        ref={confirm}
        type="button"
        onClick={onConfirm}
        className="h-7 rounded-(--radius-control) bg-state-down px-3 font-medium text-surface-raised"
      >
        {t("objectTags.detach.confirm")}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-7 rounded-(--radius-control) border border-line px-3"
      >
        {t("detail.cancel")}
      </button>
    </div>
  );
}

function AttachForm({ attach }: { attach: TagEditControl }) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState("");
  const candidates = attach.candidates ?? [];
  // Un tag qui vient d'être rattaché sort de la liste : la sélection retombe à vide.
  const selected = candidates.some((tag) => tag.tag_id === choice) ? choice : "";
  const input = useRef<HTMLInputElement>(null);

  // Le champ prend le focus à l'ouverture, et le reprend après chaque rattachement
  // pour enchaîner : le bouton, désactivé pendant l'envoi, l'aurait perdu.
  useEffect(() => {
    if (!attach.attaching) input.current?.focus();
  }, [attach.attaching, attach.candidatesPending]);

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
              <Combobox
                label={t("objectTags.attach.choose")}
                placeholder={t("objectTags.attach.placeholder")}
                emptyText={t("objectTags.attach.noMatch")}
                options={candidates.map((tag) => ({ value: tag.tag_id, label: tag.tag_name }))}
                value={selected}
                onChange={setChoice}
                inputRef={input}
                className="min-w-0 flex-1"
              />
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
