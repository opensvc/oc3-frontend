import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { SlideOver } from "@/components/ui/SlideOver";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { toTagRows } from "./tag-row";

interface TagFields {
  tag_name: string;
  tag_exclude: string;
  tag_data: string;
}

const EMPTY: TagFields = { tag_name: "", tag_exclude: "", tag_data: "" };

const INPUT = "h-8 w-full rounded-(--radius-control) border bg-surface px-2 font-mono";

/** The optional fields refused before sending: an invalid expression, data not JSON. */
function problems(fields: TagFields): { exclude: boolean; data: boolean } {
  let exclude = false;
  if (fields.tag_exclude.trim() !== "") {
    try {
      new RegExp(fields.tag_exclude);
    } catch {
      exclude = true;
    }
  }
  let data = false;
  if (fields.tag_data.trim() !== "") {
    try {
      JSON.parse(fields.tag_data);
    } catch {
      data = true;
    }
  }
  return { exclude, data };
}

/**
 * Creating a tag: its name, and optionally the regular expression of the tags it
 * cannot be attached along with, and free JSON data, as `POST /tags` takes them.
 *
 * The API requires the TagManager privilege and refuses a name already taken; its
 * message is shown as it is. The data is checked to be JSON before sending: the
 * collector decodes it when listing tags.
 */
export function TagCreatePanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** The `tag_id` of the new tag. */
  onCreated: (tagId: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<TagFields>(EMPTY);

  // Every opening starts from an empty panel.
  useEffect(() => {
    if (open) setFields(EMPTY);
  }, [open]);

  const create = useMutation({
    mutationFn: async () => {
      const body: { tag_name: string; tag_exclude?: string; tag_data?: string } = {
        tag_name: fields.tag_name.trim(),
      };
      if (fields.tag_exclude.trim() !== "") body.tag_exclude = fields.tag_exclude.trim();
      if (fields.tag_data.trim() !== "") body.tag_data = fields.tag_data.trim();
      const { data, error } = await api.POST("/tags", { body });
      if (error !== undefined) throw new Error(problemText(error));
      return toTagRows(data.data)[0]?.tag_id;
    },
    onSuccess: async (tagId) => {
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      onCreated(tagId);
      onClose();
    },
  });

  const invalid = problems(fields);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid.exclude || invalid.data) return;
    create.mutate();
  }

  function set<K extends keyof TagFields>(key: K, value: TagFields[K]) {
    setFields((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <SlideOver
      // Data-entry drawer: a click beside it must not clear what has been typed.
      closeOnOutsideClick={false}
      open={open}
      title={t("tags.create.title")}
      onClose={onClose}
      closeLabel={t("detail.close")}
      leading={<ObjectIcon kind="tag" />}
    >
      <p className="mb-3 text-ink-muted">{t("tags.create.intro")}</p>

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor="create-tag-name">
            {t("tags.fields.tag_name")}
            <span className="text-state-down" aria-hidden="true">
              {" "}
              *
            </span>
            <span className="sr-only"> ({t("tags.create.required")})</span>
          </label>
          <input
            id="create-tag-name"
            required
            autoComplete="off"
            value={fields.tag_name}
            onChange={(event) => {
              set("tag_name", event.target.value);
            }}
            className={`${INPUT} border-line`}
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor="create-tag-exclude">
            {t("tags.fields.tag_exclude")}
          </label>
          <input
            id="create-tag-exclude"
            autoComplete="off"
            value={fields.tag_exclude}
            aria-invalid={invalid.exclude}
            aria-describedby="create-tag-exclude-hint"
            onChange={(event) => {
              set("tag_exclude", event.target.value);
            }}
            className={`${INPUT} ${invalid.exclude ? "border-state-down" : "border-line"}`}
          />
          <p id="create-tag-exclude-hint" className="mt-1 text-ink-muted">
            {invalid.exclude ? (
              <span className="text-state-down">■ {t("tags.create.excludeInvalid")}</span>
            ) : (
              t("tags.create.excludeHint")
            )}
          </p>
        </div>

        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor="create-tag-data">
            {t("tags.fields.tag_data")}
          </label>
          <textarea
            id="create-tag-data"
            value={fields.tag_data}
            rows={6}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid.data}
            aria-describedby="create-tag-data-hint"
            onChange={(event) => {
              set("tag_data", event.target.value);
            }}
            className={`w-full rounded-(--radius-control) border bg-surface p-2 font-mono text-data ${invalid.data ? "border-state-down" : "border-line"}`}
          />
          <p id="create-tag-data-hint" className="mt-1 text-ink-muted">
            {invalid.data ? (
              <span className="text-state-down">■ {t("tags.create.dataInvalid")}</span>
            ) : (
              t("tags.create.dataHint")
            )}
          </p>
        </div>

        {create.isError && (
          <p role="alert" className="mb-3 text-state-down">
            ■ {create.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={
            create.isPending || fields.tag_name.trim() === "" || invalid.exclude || invalid.data
          }
          className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {create.isPending ? t("tags.create.saving") : t("tags.create.save")}
        </button>
      </form>
    </SlideOver>
  );
}
