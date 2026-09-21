import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { SlideOver } from "@/components/ui/SlideOver";
import { Switch } from "@/components/ui/Switch";

/**
 * Création d'un filterset.
 *
 * `POST /filtersets` crée ou met à jour : un nom déjà pris modifierait le filterset
 * existant au lieu d'échouer (`server/handlers/post_filtersets.go`). D'où la
 * vérification préalable, comme pour les groupes.
 */
export function CreateFiltersetPanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number | undefined) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [stats, setStats] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const { response } = await api.GET("/filtersets/{filterset_id}", {
        params: { path: { filterset_id: name }, query: { props: "id" } },
      });
      if (response.status !== 404) throw new Error(t("filtersets.create.exists", { name }));
      const { data, error } = await api.POST("/filtersets", {
        body: { fset_name: name, fset_stats: stats ? "T" : "F" },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return Array.isArray(data.data) ? data.data[0]?.id : undefined;
    },
    onSuccess: async (id) => {
      setName("");
      setStats(false);
      await queryClient.invalidateQueries({ queryKey: ["filtersets"] });
      onCreated(id);
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
      title={t("filtersets.create.title")}
      onClose={onClose}
      closeLabel={t("detail.close")}
      leading={<ObjectIcon kind="filterset" />}
    >
      <p className="mb-3 text-ink-muted">{t("filtersets.create.intro")}</p>
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor="create-filterset-name">
            {t("filtersets.fields.fset_name")}
          </label>
          <input
            id="create-filterset-name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            className="h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2"
          />
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Switch
            checked={stats}
            label={t("filtersets.fields.fset_stats")}
            stateLabel={stats ? t("detail.yes") : t("detail.no")}
            onChange={setStats}
          />
          <span className="font-medium">{t("filtersets.fields.fset_stats")}</span>
        </div>
        <p className="mb-3 text-ink-muted">{t("filtersets.create.statsHint")}</p>
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
          {create.isPending ? t("filtersets.create.submitting") : t("filtersets.create.submit")}
        </button>
      </form>
    </SlideOver>
  );
}
