import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { OsLogo } from "@/components/opensvc/OsLogo";
import { StatusBadge } from "@/components/opensvc/StatusBadge";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { statusBadge } from "@/components/opensvc/status";
import { DateTime } from "@/components/ui/DateTime";
import { RelativeTime } from "@/components/ui/RelativeTime";
import {
  resolveListSearch,
  resetsScroll,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewColumns, withSavedCols } from "@/lib/user-prefs";
import { InstanceDetailPanel } from "./InstanceDetailPanel";
import { InstanceActionsMenu } from "./InstanceActionsMenu";
import { toInstanceId } from "./instance-id";

type InstanceRow = components["schemas"]["InstanceRow"];

/** Une instance se lit d'abord par son service, puis par le node qui la porte. */
const DEFAULT_SORT = ["services.svcname", "nodes.nodename"];

/**
 * Propriétés d'instance exposées par apicollector : les noms joints d'abord, puis
 * l'ordre de `meta.available_props`. `satisfies` les confronte au schéma généré.
 */
const INSTANCE_PROPS = [
  "services.svcname",
  "nodes.nodename",
  "svc_id",
  "node_id",
  "mon_svctype",
  "mon_availstatus",
  "mon_overallstatus",
  "mon_smon_status",
  "mon_smon_global_expect",
  "mon_ipstatus",
  "mon_fsstatus",
  "mon_diskstatus",
  "mon_containerstatus",
  "mon_sharestatus",
  "mon_syncstatus",
  "mon_appstatus",
  "mon_hbstatus",
  "mon_frozen",
  "mon_frozen_at",
  "mon_encap_frozen_at",
  "mon_vmname",
  "mon_vmtype",
  "mon_guestos",
  "mon_vcpus",
  "mon_vmem",
  "mon_updated",
  "mon_changed",
] as const satisfies readonly (keyof InstanceRow)[];

/** Colonnes par défaut : quelle instance, dans quel état, vue quand. */
const DEFAULT_COLS: string[] = [
  "services.svcname",
  "nodes.nodename",
  "mon_availstatus",
  "mon_overallstatus",
  "mon_smon_status",
  "mon_frozen",
  "mon_updated",
];

const NUMERIC_PROPS = new Set<string>(["mon_vcpus", "mon_vmem"]);

const DATE_PROPS = new Set<string>([
  "mon_frozen_at",
  "mon_encap_frozen_at",
  "mon_updated",
  "mon_changed",
]);

/** Statuts rendus en badge, veilles comprises : voir `statusBadge`. */
const STATUS_PROPS = new Set<string>([
  "mon_availstatus",
  "mon_overallstatus",
  "mon_ipstatus",
  "mon_fsstatus",
  "mon_diskstatus",
  "mon_containerstatus",
  "mon_sharestatus",
  "mon_syncstatus",
  "mon_appstatus",
  "mon_hbstatus",
]);

const FAMILY: Record<string, ColumnFamily> = {
  "services.svcname": "service",
  "nodes.nodename": "node",
  svc_id: "service",
  node_id: "node",
  mon_svctype: "env",
  mon_availstatus: "state",
  mon_overallstatus: "state",
  mon_smon_status: "state",
  mon_smon_global_expect: "state",
  mon_ipstatus: "network",
  mon_fsstatus: "disk",
  mon_diskstatus: "disk",
  mon_containerstatus: "hypervisor",
  mon_sharestatus: "disk",
  mon_syncstatus: "drp",
  mon_appstatus: "app",
  mon_hbstatus: "cluster",
  mon_frozen: "state",
  mon_frozen_at: "time",
  mon_encap_frozen_at: "time",
  mon_vmname: "hypervisor",
  mon_vmtype: "hypervisor",
  mon_guestos: "os",
  mon_vcpus: "cpu",
  mon_vmem: "memory",
  mon_updated: "time",
  mon_changed: "time",
};

/** Les noms joints sont triables : `orderby` les résout par les jointures du mapping. */
const COLUMNS: ListColumn<InstanceRow>[] = INSTANCE_PROPS.map((prop) => ({
  prop,
  labelKey: `instances.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "service",
  render: (row: InstanceRow, locale: string) => {
    const value = row[prop];
    if (prop === "nodes.nodename")
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <OsLogo osName={row["nodes.os_name"] ?? undefined} />
          {value}
        </span>
      );
    if (STATUS_PROPS.has(prop) && typeof value === "string")
      return <StatusBadge {...statusBadge(value)} />;
    // Dernier rapport de l'agent pour cette instance : son ancienneté se lit mieux en relatif.
    if (prop === "mon_updated" && typeof value === "string")
      return <RelativeTime value={value} locale={locale} />;
    if (DATE_PROPS.has(prop) && typeof value === "string")
      return <DateTime value={value} locale={locale} />;
    return value;
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/**
 * Colonnes affichées, plus les deux identifiants qui désignent l'instance, et l'OS
 * du node quand son nom est affiché, pour le logo.
 */
function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, ALL_PROPS);
  const extra = shown.includes("nodes.nodename") ? ["nodes.os_name"] : [];
  return [...new Set(["svc_id", "node_id", ...shown, ...extra])].join(",");
}

function useInstances(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["instances", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
      const { data, error } = await api.GET("/services_instances", {
        params: {
          query: {
            props: queryProps(search.cols),
            orderby: search.sort.join(","),
            offset: search.offset,
            limit: search.limit + 1,
          },
        },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const all: InstanceRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function InstancesPage() {
  const { t } = useTranslation();
  const prefs = useViewColumns("instances");
  const search = withSavedCols(
    resolveListSearch(useSearch({ from: "/instances" }), DEFAULT_SORT),
    prefs.cols,
  );
  const navigate = useNavigate({ from: "/instances" });
  const { data, isPending, isError, error, isFetching } = useInstances(search);

  /** Identifiants de toute la sélection, sans pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/services_instances", {
      params: { query: { props: "svc_id,node_id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: InstanceRow[] = Array.isArray(data.data) ? data.data : [];
    return rows
      .map((row) => toInstanceId(row.svc_id, row.node_id))
      .filter((id): id is string => id !== undefined);
  }

  function update(next: Partial<ResolvedListSearch>) {
    // Les colonnes choisies suivent le compte, les autres états restent dans l'URL.
    if ("cols" in next) prefs.save(next.cols);
    void navigate({
      search: (previous) => ({ ...previous, ...toSearchParams(next) }),
      resetScroll: resetsScroll(next),
    });
  }

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selected = data?.rows.find((row) => toInstanceId(row.svc_id, row.node_id) === search.sel);
  // « service @ node » plutôt que l'identifiant composé, pour nommer les refus.
  const instanceNames = Object.fromEntries(
    (data?.rows ?? []).map((row) => [
      toInstanceId(row.svc_id, row.node_id) ?? "",
      `${row["services.svcname"] ?? row.svc_id ?? ""} @ ${row["nodes.nodename"] ?? row.node_id ?? ""}`,
    ]),
  );

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="instance" className="h-5 w-5" />
          {t("instances.title")}
        </h1>
        <InstanceActionsMenu
          instances={selectedIds.map((id) => ({ id, name: instanceNames[id] ?? id }))}
        />
      </div>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => toInstanceId(row.svc_id, row.node_id)}
        search={search}
        onChange={update}
        // apicollector n'a pas d'endpoint d'instances filtré par filterset.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        onSelectionChange={setSelectedIds}
        selectAllMatching={allIds}
      />

      <InstanceDetailPanel
        instanceId={search.sel}
        label={
          selected === undefined
            ? ""
            : `${selected["services.svcname"] ?? ""} @ ${selected["nodes.nodename"] ?? ""}`
        }
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
