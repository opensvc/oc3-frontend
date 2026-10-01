import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { RelatedTable, type RelatedColumn } from "@/components/opensvc/RelatedTable";
import { StatusBadge } from "@/components/opensvc/StatusBadge";
import { DateTime } from "@/components/ui/DateTime";
import { filterKey } from "@/lib/column-filters";
import { formatLogMessage, logLevelState } from "@/features/logs/log-message";
import { NODE_LOGS_LIMIT, useNodeLogs } from "./queries";

type LogRow = components["schemas"]["LogRow"];

/**
 * The log entries of a node, the most recent first, as the historical node logs
 * tab: date, level, service, user, action and message, the message filled from its
 * values. The latest `NODE_LOGS_LIMIT` show here; the Logs view, filtered on the
 * node, has them all.
 */
export function NodeLogs({ nodeId, locale }: { nodeId: string; locale: string }) {
  const { t } = useTranslation();
  const logs = useNodeLogs(nodeId);
  const rows = logs.data?.rows ?? [];
  const total = logs.data?.total;

  const columns: RelatedColumn<LogRow>[] = [
    {
      key: "log_date",
      label: t("logs.fields.log_date"),
      render: (row) => <DateTime value={row.log_date} locale={locale} />,
    },
    {
      key: "log_level",
      label: t("logs.fields.log_level"),
      render: (row) =>
        row.log_level === undefined ? null : (
          <StatusBadge state={logLevelState(row.log_level)} label={row.log_level} />
        ),
    },
    {
      key: "services.svcname",
      label: t("logs.fields.services.svcname"),
      render: (row) =>
        row["services.svcname"] === null || row["services.svcname"] === undefined ? null : (
          <CrossLink kind="service" id={row.svc_id}>
            {row["services.svcname"]}
          </CrossLink>
        ),
    },
    { key: "log_user", label: t("logs.fields.log_user"), render: (row) => row.log_user },
    { key: "log_action", label: t("logs.fields.log_action"), render: (row) => row.log_action },
    {
      key: "log_fmt",
      label: t("logs.fields.log_fmt"),
      grow: true,
      render: (row) => {
        const message = formatLogMessage(row.log_fmt, row.log_dict);
        return message.corrupted ? (
          <span>
            {message.parts} <span className="text-state-warn">▲ {t("logs.corrupted")}</span>
          </span>
        ) : (
          <span>{message.parts}</span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <RelatedTable
        columns={columns}
        groups={[{ key: "all", label: "", rows }]}
        rowKey={(row) => String(row.id)}
        isPending={logs.isPending}
        errorMessage={logs.isError ? logs.error.message : null}
        empty={t("nodes.logs.empty")}
        caption={t("nodes.related.logs")}
      />
      {rows.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 text-ink-muted">
          {logs.data?.hasMore === true &&
            t("nodes.logs.latest", {
              count: NODE_LOGS_LIMIT,
              total: total ?? NODE_LOGS_LIMIT,
            })}
          <Link
            to="/logs"
            search={{ [filterKey("node_id")]: `eq:${nodeId}` }}
            className="text-accent hover:underline"
          >
            {t("nodes.logs.open")}
          </Link>
        </p>
      )}
    </div>
  );
}
