import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { RelatedTable, type RelatedColumn } from "@/components/opensvc/RelatedTable";
import { SeverityBadge } from "@/components/opensvc/SeverityBadge";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useNodeAlerts } from "./queries";

type AlertRow = components["schemas"]["AlertRow"];

export function NodeAlerts({ nodeId, locale }: { nodeId: string; locale: string }) {
  const { t } = useTranslation();
  const alerts = useNodeAlerts(nodeId);

  const columns: RelatedColumn<AlertRow>[] = [
    {
      key: "dash_severity",
      label: t("alerts.fields.dash_severity"),
      render: (row) => <SeverityBadge severity={row.dash_severity ?? 0} />,
    },
    {
      key: "dash_type",
      label: t("alerts.fields.dash_type"),
      grow: true,
      // Le type fait le message quand l'alerte n'en a pas d'autre.
      render: (row) => (
        <Link
          to="/"
          search={{ sel: String(row.id) }}
          title={t("nodes.alerts.open")}
          className="underline decoration-line underline-offset-2"
        >
          {row.dash_type}
          {row.alert !== undefined && row.alert !== "" && (
            <span className="block text-ink-muted no-underline">{row.alert}</span>
          )}
        </Link>
      ),
    },
    {
      key: "dash_updated",
      label: t("alerts.fields.dash_updated"),
      render: (row) => <RelativeTime value={row.dash_updated} locale={locale} />,
    },
    {
      key: "dash_created",
      label: t("alerts.fields.dash_created"),
      render: (row) => <RelativeTime value={row.dash_created} locale={locale} />,
    },
  ];

  return (
    <RelatedTable
      columns={columns}
      groups={[{ key: "all", label: "", rows: alerts.data ?? [] }]}
      rowKey={(row) => String(row.id)}
      isPending={alerts.isPending}
      errorMessage={alerts.isError ? alerts.error.message : null}
      empty={t("nodes.alerts.empty")}
      caption={t("nodes.related.alerts")}
    />
  );
}
