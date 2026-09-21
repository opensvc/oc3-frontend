import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { linkedField } from "@/components/opensvc/linked-field";
import { formatDateTime } from "@/lib/format";

type AlertRow = components["schemas"]["AlertRow"];

const text = (prop: keyof AlertRow) => (row: AlertRow) => {
  const value = row[prop];
  // A joined prop is null when the entry aims at the other kind of object.
  return value === undefined || value === null ? undefined : String(value);
};

const date = (prop: keyof AlertRow) => (row: AlertRow, locale: string) => {
  const value = row[prop];
  return typeof value === "string" ? formatDateTime(value, locale) : undefined;
};

const field = (
  prop: keyof AlertRow,
  format?: (row: AlertRow, locale: string) => string | undefined,
) => ({ prop, format: format ?? text(prop) });

const GROUPS: DetailGroup<AlertRow>[] = [
  {
    key: "alert",
    family: "alert",
    fields: [
      field("dash_type"),
      field("dash_severity"),
      field("alert"),
      field("dash_env"),
      field("dash_instance"),
      field("dash_created", date("dash_created")),
      field("dash_updated", date("dash_updated")),
    ],
  },
  {
    key: "object",
    family: "service",
    fields: [
      linkedField<AlertRow>(
        "services.svcname",
        "service",
        (row) => row.svc_id,
        text("services.svcname"),
      ),
      linkedField<AlertRow>("nodes.nodename", "node", (row) => row.node_id, text("nodes.nodename")),
      field("svc_id"),
      field("node_id"),
    ],
  },
  {
    key: "raw",
    family: "state",
    fields: [field("id"), field("dash_fmt"), field("dash_dict"), field("dash_dict_md5")],
  },
];

const PROPS = GROUPS.flatMap((group) => group.fields.map((f) => f.prop)).join(",");

export function AlertDetailPanel({
  alertId,
  label,
  onClose,
}: {
  alertId: string | undefined;
  label: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const {
    data: alert,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["alert", alertId],
    enabled: alertId !== undefined,
    queryFn: async () => {
      const { data, error: failure } = await api.GET("/alerts/{id}", {
        params: { path: { id: alertId ?? "" }, query: { props: PROPS } },
      });
      if (failure !== undefined) throw new Error(JSON.stringify(failure));
      const rows: AlertRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });

  return (
    <DetailPanel
      kind="dashboard"
      open={alertId !== undefined}
      title={alert?.dash_type ?? (label === "" ? t("dashboard.detail.title") : label)}
      onClose={onClose}
      groups={GROUPS}
      row={alert}
      labelPrefix="alerts.fields"
      groupPrefix="dashboard.detail.groups"
      isPending={isPending}
      errorMessage={isError ? error.message : null}
    />
  );
}
