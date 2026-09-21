import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { SlideOver } from "@/components/ui/SlideOver";

const FIELDS = ["app", "description", "app_domain", "app_team_ops"] as const;
type Field = (typeof FIELDS)[number];

const EMPTY: Record<Field, string> = { app: "", description: "", app_domain: "", app_team_ops: "" };

/**
 * Création d'un code application. Le serveur refuse un code déjà pris (409) et
 * demande le privilège AppManager (403) : on affiche son message tel quel plutôt
 * que de deviner la règle côté client.
 */
export function CreateAppPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<Field, string>>(EMPTY);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/apps", {
        body: {
          app: values.app,
          description: values.description,
          app_domain: values.app_domain,
          app_team_ops: values.app_team_ops,
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data;
    },
    onSuccess: async () => {
      setValues(EMPTY);
      await queryClient.invalidateQueries({ queryKey: ["apps"] });
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <SlideOver
      // Tiroir de saisie : un clic à côté ne doit pas effacer ce qui est tapé.
      closeOnOutsideClick={false}
      open={open}
      title={t("apps.create.title")}
      onClose={onClose}
      closeLabel={t("detail.close")}
    >
      <form onSubmit={onSubmit}>
        {FIELDS.map((field) => (
          <div key={field} className="mb-3">
            <label className="mb-1 block font-medium" htmlFor={`create-app-${field}`}>
              {t(`apps.fields.${field}`)}
            </label>
            <input
              id={`create-app-${field}`}
              required={field === "app"}
              value={values[field]}
              onChange={(event) => {
                setValues((previous) => ({ ...previous, [field]: event.target.value }));
              }}
              className="h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2"
            />
          </div>
        ))}

        {create.isError && (
          <p role="alert" className="mb-3 text-state-down">
            ■ {create.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={create.isPending}
          className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {create.isPending ? t("apps.create.submitting") : t("apps.create.submit")}
        </button>
      </form>
    </SlideOver>
  );
}
