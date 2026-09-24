import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import { problemText } from "@/lib/api/problem";
import { formatDateTime } from "@/lib/format";
import { useForm, type FormRow } from "./use-form";

const text = (prop: keyof FormRow) => (row: FormRow) => {
  const value = row[prop];
  return value === undefined || value === null || value === "" ? undefined : String(value);
};

const GROUPS: DetailGroup<FormRow>[] = [
  {
    key: "identity",
    family: "state",
    fields: [
      { prop: "form_name", format: text("form_name") },
      { prop: "form_type", format: text("form_type") },
      { prop: "form_folder", format: text("form_folder") },
    ],
  },
  {
    key: "record",
    family: "time",
    fields: [
      { prop: "form_author", format: text("form_author") },
      { prop: "form_created", format: (row, locale) => formatDateTime(row.form_created, locale) },
      { prop: "id", format: text("id") },
    ],
  },
];

/**
 * A form: its properties, then its definition as stored, in YAML. Editing opens
 * the form panel; deleting also removes its publications and responsibles, as the
 * collector does.
 */
export function FormDetailPanel({
  formId,
  name,
  onClose,
  onEdit,
}: {
  formId: string | undefined;
  name: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: form, isPending, isError, error } = useForm(formId);

  const remove = useMutation({
    mutationFn: async () => {
      const { error: failure } = await api.DELETE("/forms/{form_id}", {
        params: { path: { form_id: Number(formId) } },
      });
      if (failure !== undefined) throw new Error(problemText(failure));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      onClose();
    },
  });

  return (
    <DetailPanel
      kind="form"
      open={formId !== undefined}
      title={form?.form_name ?? (name === "" ? t("forms.detail.title") : name)}
      onClose={onClose}
      groups={GROUPS}
      row={form}
      labelPrefix="forms.fields"
      groupPrefix="forms.detail.groups"
      isPending={isPending}
      errorMessage={isError ? error.message : null}
      actions={
        <div>
          <h3 className="mb-1 font-semibold text-ink-muted">{t("forms.fields.form_yaml")}</h3>
          {form?.form_yaml === undefined || form.form_yaml === "" ? (
            <p className="mb-3 text-ink-muted">{t("forms.detail.noDefinition")}</p>
          ) : (
            <pre className="mb-3 max-h-96 overflow-auto rounded-(--radius-control) border border-line bg-surface-sunken p-2 text-data">
              {form.form_yaml}
            </pre>
          )}
          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-8 items-center gap-1.5 rounded-(--radius-control) border border-line px-3 text-ink hover:bg-surface-sunken"
            >
              <PencilIcon />
              {t("forms.form.edit")}
            </button>
            <div>
              <ConfirmButton
                icon={<TrashIcon />}
                label={t("detail.delete")}
                question={t("forms.delete.question", { name: form?.form_name ?? "" })}
                confirmLabel={t("detail.deleteConfirm")}
                cancelLabel={t("detail.cancel")}
                pendingLabel={t("detail.deleting")}
                pending={remove.isPending}
                onConfirm={() => {
                  remove.mutate();
                }}
              />
              {remove.isError && (
                <p role="alert" className="mt-2 text-state-down">
                  ■ {remove.error.message}
                </p>
              )}
            </div>
          </div>
        </div>
      }
    />
  );
}
