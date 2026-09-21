import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { SlideOver } from "@/components/ui/SlideOver";

/**
 * Creating a group.
 *
 * `POST /groups` creates or updates: a name already taken would modify the existing
 * group instead of failing (`server/handlers/post_groups.go`). A creation form must
 * not do that silently, hence the check beforehand, as for nodes.
 */
export function CreateGroupPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [privilege, setPrivilege] = useState("F");

  const create = useMutation({
    mutationFn: async () => {
      const { response } = await api.GET("/groups/{group_id}", {
        params: { path: { group_id: role }, query: { props: "id" } },
      });
      if (response.status !== 404) throw new Error(t("groups.create.exists", { role }));

      const { data, error } = await api.POST("/groups", {
        body: { role, description, privilege },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data;
    },
    onSuccess: async () => {
      setRole("");
      setDescription("");
      setPrivilege("F");
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <SlideOver
      // Data-entry drawer: a click beside it must not clear what has been typed.
      closeOnOutsideClick={false}
      open={open}
      title={t("groups.create.title")}
      onClose={onClose}
      closeLabel={t("detail.close")}
    >
      <p className="mb-3 text-ink-muted">{t("groups.create.intro")}</p>

      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor="create-group-role">
            {t("groups.fields.role")}
          </label>
          <input
            id="create-group-role"
            required
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
            }}
            className="h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor="create-group-privilege">
            {t("groups.fields.privilege")}
          </label>
          <select
            id="create-group-privilege"
            value={privilege}
            onChange={(event) => {
              setPrivilege(event.target.value);
            }}
            className="h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2"
          >
            <option value="F">{t("groups.privilege.F")}</option>
            <option value="T">{t("groups.privilege.T")}</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor="create-group-description">
            {t("groups.fields.description")}
          </label>
          <input
            id="create-group-description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            className="h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2"
          />
        </div>

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
          {create.isPending ? t("groups.create.submitting") : t("groups.create.submit")}
        </button>
      </form>
    </SlideOver>
  );
}
