import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "@/components/ui/DateTime";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { useFiltersets } from "@/lib/api/filtersets";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { FrozenMark } from "@/components/opensvc/FrozenMark";
import { ServiceActionsMenu } from "./ServiceActionsMenu";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { StatusBadge } from "@/components/opensvc/StatusBadge";
import { statusBadge } from "@/components/opensvc/status";
import {
  resolveListSearch,
  resetsScroll,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { ServiceDetailPanel } from "./ServiceDetailPanel";

type ServiceRow = components["schemas"]["ServiceRow"];

const DEFAULT_SORT = ["svcname"];

/**
 * Toutes les propriétés de service exposées par apicollector, dans l'ordre de son
 * `meta.available_props`. `satisfies` les confronte au schéma généré : un prop
 * renommé côté oc3 casse le typecheck au lieu de disparaître en silence.
 */
const SERVICE_PROPS = [
  "id",
  "svc_id",
  "svcname",
  "cluster_id",
  "svc_status",
  "svc_availstatus",
  "svc_app",
  "svc_env",
  "svc_ha",
  "svc_topology",
  "svc_frozen",
  "svc_placement",
  "svc_provisioned",
  "svc_flex_min_nodes",
  "svc_flex_max_nodes",
  "svc_flex_target",
  "svc_flex_cpu_low_threshold",
  "svc_flex_cpu_high_threshold",
  "svc_autostart",
  "svc_nodes",
  "svc_drpnode",
  "svc_drpnodes",
  "svc_drptype",
  "svc_comment",
  "svc_created",
  "svc_status_updated",
  "svc_hostid",
  "svc_wave",
  "svc_config",
  "svc_config_updated",
  "svc_metrocluster",
  "svc_drnoaction",
  "svc_notifications",
  "svc_snooze_till",
  "updated",
] as const satisfies readonly (keyof ServiceRow)[];

/** Colonnes affichées par défaut : l'identité du service et son état. */
const DEFAULT_COLS: string[] = [
  "svcname",
  "svc_availstatus",
  "svc_status",
  "svc_app",
  "svc_status_updated",
];

/** Props entiers du mapping `service` d'oc3 (helpers `colInt` et `col`), alignés à droite. */
const NUMERIC_PROPS = new Set<string>([
  "id",
  "svc_ha",
  "svc_wave",
  "svc_flex_min_nodes",
  "svc_flex_max_nodes",
  "svc_flex_target",
  "svc_flex_cpu_low_threshold",
  "svc_flex_cpu_high_threshold",
]);

/** Props que le collector stocke en datetime. */
const DATE_PROPS = new Set<string>([
  "svc_created",
  "svc_status_updated",
  "svc_config_updated",
  "svc_snooze_till",
  "updated",
]);

/** Props d'état, rendus avec la forme et le libellé du badge plutôt qu'en texte brut. */
const STATUS_PROPS = new Set<string>(["svc_status", "svc_availstatus"]);

/** Famille de chaque colonne, dans le vocabulaire du collector historique. */
const FAMILY: Record<string, ColumnFamily> = {
  id: "service",
  svc_id: "service",
  svcname: "service",
  cluster_id: "cluster",
  svc_status: "service",
  svc_availstatus: "service",
  svc_app: "app",
  svc_env: "env",
  svc_ha: "service",
  svc_topology: "service",
  svc_frozen: "service",
  svc_placement: "node",
  svc_provisioned: "service",
  svc_flex_min_nodes: "node",
  svc_flex_max_nodes: "node",
  svc_flex_target: "node",
  svc_flex_cpu_low_threshold: "cpu",
  svc_flex_cpu_high_threshold: "cpu",
  svc_autostart: "node",
  svc_nodes: "node",
  svc_drpnode: "node",
  svc_drpnodes: "node",
  svc_drptype: "service",
  svc_comment: "service",
  svc_created: "time",
  svc_status_updated: "time",
  svc_hostid: "node",
  svc_wave: "service",
  svc_config: "service",
  svc_config_updated: "time",
  svc_metrocluster: "cluster",
  svc_drnoaction: "service",
  svc_notifications: "alert",
  svc_snooze_till: "alert",
  updated: "time",
};

const COLUMNS: ListColumn<ServiceRow>[] = SERVICE_PROPS.map((prop) => ({
  prop,
  labelKey: `services.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "node",
  render: (row: ServiceRow, locale: string) => {
    const value = row[prop];
    if (prop === "svc_app")
      return (
        <CrossLink kind="app" id={typeof value === "string" ? value : undefined}>
          {value}
        </CrossLink>
      );
    if (STATUS_PROPS.has(prop) && typeof value === "string") {
      return <StatusBadge {...statusBadge(value)} />;
    }
    // Comme le dernier contact d'un node : c'est l'ancienneté du statut qui compte.
    if (prop === "svc_status_updated" && typeof value === "string")
      return <RelativeTime value={value} locale={locale} />;
    if (DATE_PROPS.has(prop) && typeof value === "string")
      return <DateTime value={value} locale={locale} />;
    return value;
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/** Ne demander que les colonnes affichées : apicollector fait le pushdown en base. */
/** `svc_frozen` est toujours demandé : le gel se signale même colonne masquée. */
function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, ALL_PROPS);
  return [...new Set(["svc_id", "svc_frozen", ...shown])].join(",");
}

function useServices(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["services", search.sort, search.offset, search.limit, search.fset, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
      const query = {
        props: queryProps(search.cols),
        orderby: search.sort.join(","),
        offset: search.offset,
        limit: search.limit + 1,
      };
      const response =
        search.fset === ""
          ? await api.GET("/services", { params: { query } })
          : await api.GET("/filtersets/{filterset_id}/services", {
              params: { path: { filterset_id: search.fset }, query },
            });
      if (response.error !== undefined) throw new Error(JSON.stringify(response.error));
      const all: ServiceRow[] = Array.isArray(response.data.data) ? response.data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function ServicesPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("services");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/services" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/services" });
  const { data, isPending, isError, error, isFetching } = useServices(search);
  const filtersets = useFiltersets();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /** Identifiants de toute la sélection, filterset compris, sans pagination. */
  async function allIds(): Promise<string[]> {
    const query = { props: "svc_id", limit: 0 };
    const response =
      search.fset === ""
        ? await api.GET("/services", { params: { query } })
        : await api.GET("/filtersets/{filterset_id}/services", {
            params: { path: { filterset_id: search.fset }, query },
          });
    if (response.error !== undefined) throw new Error(JSON.stringify(response.error));
    const rows: ServiceRow[] = Array.isArray(response.data.data) ? response.data.data : [];
    return rows.map((row) => row.svc_id).filter((id): id is string => id !== undefined);
  }

  function update(next: Partial<ResolvedListSearch>) {
    // Colonnes et tri suivent le compte, les autres états restent dans l'URL.
    if ("cols" in next) prefs.saveCols(next.cols);
    if ("sort" in next) prefs.saveSort(next.sort);
    void navigate({
      search: (previous) => ({ ...previous, ...toSearchParams(next) }),
      resetScroll: resetsScroll(next),
    });
  }

  const selected = data?.rows.find((row) => row.svc_id === search.sel);
  // Noms de la page affichée : une sélection étendue aux pages suivantes ne les a
  // pas tous, l'identifiant sert alors de repli dans les messages.
  const svcNames = Object.fromEntries(
    (data?.rows ?? []).map((row) => [row.svc_id ?? "", row.svcname ?? ""]),
  );

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="service" className="h-5 w-5" />
          {t("services.title")}
        </h1>
        <ServiceActionsMenu
          services={selectedIds.map((id) => ({ id, name: svcNames[id] ?? id }))}
        />
      </div>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => row.svc_id}
        search={search}
        onChange={update}
        filtersets={filtersets.data ?? []}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        rowLead={(row) => <FrozenMark frozen={row.svc_frozen === "frozen"} />}
        onSelectionChange={setSelectedIds}
        selectAllMatching={allIds}
      />

      <ServiceDetailPanel
        svcId={search.sel}
        svcname={selected?.svcname ?? ""}
        onClose={() => {
          update({ sel: undefined, tab: undefined });
        }}
        tab={search.tab}
        onTabChange={(tab) => {
          update({ tab });
        }}
      />
    </section>
  );
}
