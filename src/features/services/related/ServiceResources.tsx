import { useTranslation } from "react-i18next";
import {
  RelatedTable,
  type RelatedColumn,
  type RelatedGroup,
} from "@/components/opensvc/RelatedTable";
import { StatusBadge } from "@/components/opensvc/StatusBadge";
import { statusBadge } from "@/components/opensvc/status";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { resourceFlag } from "@/features/resources/resource-format";
import { useServiceResources, type ServiceResource } from "./queries";

/**
 * The resources of the service, one group per instance (the node, and the
 * container of an encapsulated service), each with its status, its type and
 * description, its flags and the age of its last report; the first line of its log
 * when it has one. The whole list, with every column, is the Resources view.
 */
export function ServiceResources({ svcId, locale }: { svcId: string; locale: string }) {
  const { t } = useTranslation();
  const resources = useServiceResources(svcId);

  const groups = new Map<string, RelatedGroup<ServiceResource>>();
  for (const row of resources.data ?? []) {
    const key = `${row.node_id ?? ""}/${row.vmname ?? ""}`;
    const label =
      row.vmname !== undefined && row.vmname !== ""
        ? `${row.nodename} / ${row.vmname}`
        : row.nodename;
    const group = groups.get(key) ?? { key, label, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  const columns: RelatedColumn<ServiceResource>[] = [
    {
      key: "rid",
      label: t("resources.fields.rid"),
      render: (row) => <span className="font-mono">{row.rid}</span>,
    },
    {
      key: "status",
      label: t("resources.fields.res_status"),
      render: (row) =>
        row.res_status === undefined || row.res_status === "" ? null : (
          <StatusBadge {...statusBadge(row.res_status)} />
        ),
    },
    { key: "type", label: t("resources.fields.res_type"), render: (row) => row.res_type },
    {
      key: "desc",
      label: t("resources.fields.res_desc"),
      grow: true,
      wrap: true,
      render: (row) => {
        const log = (row.res_log ?? "").split("\n").find((line) => line.trim() !== "");
        return (
          <>
            {row.res_desc}
            {log !== undefined && (
              <span
                className="block truncate font-mono text-data text-ink-muted"
                title={row.res_log}
              >
                {log}
              </span>
            )}
          </>
        );
      },
    },
    {
      key: "flags",
      label: t("services.resources.flags"),
      render: (row) => <ResourceFlags row={row} />,
    },
    {
      key: "updated",
      label: t("resources.fields.updated"),
      render: (row) =>
        row.updated === undefined || row.updated === "" ? null : (
          <RelativeTime value={row.updated} locale={locale} />
        ),
    },
  ];

  return (
    <RelatedTable
      columns={columns}
      groups={[...groups.values()].sort((a, b) => a.label.localeCompare(b.label))}
      rowKey={(row) =>
        String(row.id ?? `${row.node_id ?? ""}/${row.vmname ?? ""}/${row.rid ?? ""}`)
      }
      isPending={resources.isPending}
      errorMessage={resources.isError ? resources.error.message : null}
      empty={t("services.resources.empty")}
      caption={t("services.related.resources")}
    />
  );
}

/** The flags set on a resource, in words: those off are not shown. */
function ResourceFlags({ row }: { row: ServiceResource }) {
  const { t } = useTranslation();
  const set = (["res_monitor", "res_disable", "res_optional"] as const).filter(
    (flag) => resourceFlag(row[flag]) === true,
  );
  if (set.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {set.map((flag) => (
        <span key={flag} className="rounded-full bg-surface-sunken px-1.5 text-data text-ink-muted">
          {t(`services.resources.flag.${flag}`)}
        </span>
      ))}
    </span>
  );
}
