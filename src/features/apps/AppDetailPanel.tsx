import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { TrashIcon } from "@/components/ui/icons";
import { problemText } from "@/lib/api/problem";
import { formatDateTime } from "@/lib/format";

type AppRow = components["schemas"]["AppRow"];

const text = (prop: keyof AppRow) => (row: AppRow) => {
  const value = row[prop];
  return value === undefined ? undefined : String(value);
};

const GROUPS: DetailGroup<AppRow>[] = [
  {
    key: "identity",
    family: "app",
    fields: [
      { prop: "app", format: text("app") },
      { prop: "description", format: text("description") },
      { prop: "app_domain", format: text("app_domain") },
      { prop: "app_team_ops", format: text("app_team_ops") },
      { prop: "id", format: text("id") },
      {
        prop: "updated",
        format: (row, locale) => formatDateTime(row.updated, locale),
      },
    ],
  },
];

export function AppDetailPanel({
  appId,
  label,
  onClose,
}: {
  appId: string | undefined;
  label: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    data: app,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["app", appId],
    enabled: appId !== undefined,
    queryFn: async () => {
      // Unlike nodes and services, this endpoint returns the bare row.
      const { data, error: failure } = await api.GET("/apps/{app_id}", {
        params: { path: { app_id: appId ?? "" } },
      });
      if (failure !== undefined) throw new Error(JSON.stringify(failure));
      return data;
    },
  });

  // The links of the application code go too: responsibles and publications.
  const remove = useMutation({
    mutationFn: async () => {
      const { error: failure } = await api.DELETE("/apps/{app_id}", {
        params: { path: { app_id: appId ?? "" } },
      });
      if (failure !== undefined) throw new Error(problemText(failure));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["apps"] });
      onClose();
    },
  });

  return (
    <DetailPanel
      kind="app"
      recordId={appId}
      open={appId !== undefined}
      title={app?.app ?? (label === "" ? t("apps.detail.title") : label)}
      onClose={onClose}
      groups={GROUPS}
      row={app}
      labelPrefix="apps.fields"
      groupPrefix="apps.detail.groups"
      isPending={isPending}
      errorMessage={isError ? error.message : null}
      actions={
        <>
          <ConfirmButton
            icon={<TrashIcon />}
            label={t("detail.delete")}
            question={t("apps.delete.question", { app: app?.app ?? "" })}
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
        </>
      }
    />
  );
}
