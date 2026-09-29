import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { SlideOver } from "@/components/ui/SlideOver";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { FORM_TYPES, isFormType, type FormRow, type FormType } from "./use-form";

interface FormFields {
  form_name: string;
  form_type: FormType;
  form_folder: string;
  form_yaml: string;
}

const EMPTY: FormFields = { form_name: "", form_type: "custo", form_folder: "/", form_yaml: "" };

function fromRow(row: FormRow | null | undefined): FormFields {
  if (row === null || row === undefined) return EMPTY;
  return {
    form_name: row.form_name ?? "",
    form_type: isFormType(row.form_type) ? row.form_type : EMPTY.form_type,
    form_folder: row.form_folder ?? "",
    form_yaml: row.form_yaml ?? "",
  };
}

/** Id of the form a creation or a change answers with: {"data": [row]}. */
function savedID(data: unknown): number | undefined {
  if (typeof data !== "object" || data === null || !("data" in data)) return undefined;
  const rows = (data as { data: unknown }).data;
  if (!Array.isArray(rows)) return undefined;
  const first: unknown = rows[0];
  if (typeof first !== "object" || first === null || !("id" in first)) return undefined;
  const id = (first as { id: unknown }).id;
  return typeof id === "number" ? id : undefined;
}

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2";

/**
 * Creating or editing a form, in a single panel: its name, its type, its folder
 * and its definition, in YAML.
 *
 * The API checks the definition parses and refuses it otherwise; its message is
 * shown as it is. A change sends only the fields that changed: the collector logs
 * each change, and records each new definition in the form's revision history.
 */
export function FormFormPanel({
  open,
  form,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Form to edit; absent, the panel creates one. */
  form?: FormRow | null;
  onClose: () => void;
  onSaved?: (id: number | undefined) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const editing = form !== undefined && form !== null;
  const [fields, setFields] = useState<FormFields>(fromRow(form));

  // Every opening starts again from the form to edit, or from an empty panel.
  useEffect(() => {
    if (open) setFields(fromRow(form));
  }, [open, form]);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const initial = fromRow(form);
        const changed = Object.fromEntries(
          (Object.keys(fields) as (keyof FormFields)[])
            .filter((key) => fields[key] !== initial[key])
            .map((key) => [key, fields[key]]),
        );
        if (Object.keys(changed).length === 0) return form.id;
        const { data, error } = await api.POST("/forms/{form_id}", {
          params: { path: { form_id: form.id ?? 0 } },
          body: changed,
        });
        if (error !== undefined) throw new Error(problemText(error));
        return savedID(data) ?? form.id;
      }
      const body: Record<string, string> = {
        form_name: fields.form_name,
        form_type: fields.form_type,
        form_folder: fields.form_folder,
      };
      if (fields.form_yaml.trim() !== "") body.form_yaml = fields.form_yaml;
      const { data, error } = await api.POST("/forms", { body });
      if (error !== undefined) throw new Error(problemText(error));
      return savedID(data);
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      await queryClient.invalidateQueries({ queryKey: ["form"] });
      onSaved?.(id);
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  function set<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((previous) => ({ ...previous, [key]: value }));
  }

  const prefix = editing ? "edit-form" : "create-form";

  return (
    <SlideOver
      // Data-entry drawer: a click beside it must not clear what has been typed.
      // Created like the other objects, closing on a click beside it; an existing one
      // being edited is not dropped by a stray click.
      closeOnOutsideClick={!editing}
      size="wide"
      open={open}
      title={editing ? t("forms.form.editTitle") : t("forms.form.createTitle")}
      onClose={onClose}
      closeLabel={t("detail.close")}
      leading={<ObjectIcon kind="form" />}
    >
      <p className="mb-3 text-ink-muted">
        {editing ? t("forms.form.editIntro") : t("forms.form.createIntro")}
      </p>

      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor={`${prefix}-name`}>
            {t("forms.fields.form_name")}
          </label>
          <input
            id={`${prefix}-name`}
            required
            value={fields.form_name}
            onChange={(event) => {
              set("form_name", event.target.value);
            }}
            className={INPUT}
          />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium" htmlFor={`${prefix}-type`}>
              {t("forms.fields.form_type")}
            </label>
            <select
              id={`${prefix}-type`}
              value={fields.form_type}
              onChange={(event) => {
                if (isFormType(event.target.value)) set("form_type", event.target.value);
              }}
              className={INPUT}
            >
              {FORM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`forms.types.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium" htmlFor={`${prefix}-folder`}>
              {t("forms.fields.form_folder")}
            </label>
            <input
              id={`${prefix}-folder`}
              value={fields.form_folder}
              onChange={(event) => {
                set("form_folder", event.target.value);
              }}
              className={`${INPUT} font-mono`}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor={`${prefix}-yaml`}>
            {t("forms.fields.form_yaml")}
          </label>
          <textarea
            id={`${prefix}-yaml`}
            value={fields.form_yaml}
            onChange={(event) => {
              set("form_yaml", event.target.value);
            }}
            rows={20}
            spellCheck={false}
            autoComplete="off"
            aria-describedby={`${prefix}-yaml-hint`}
            className="w-full rounded-(--radius-control) border border-line bg-surface p-2 font-mono text-data"
          />
          <p id={`${prefix}-yaml-hint`} className="mt-1 text-ink-muted">
            {t("forms.form.yamlHint")}
          </p>
        </div>

        {save.isError && (
          <p role="alert" className="mb-3 text-state-down">
            ■ {save.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={save.isPending}
          className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {save.isPending
            ? t("forms.form.saving")
            : editing
              ? t("forms.form.saveEdit")
              : t("forms.form.saveCreate")}
        </button>
      </form>
    </SlideOver>
  );
}
