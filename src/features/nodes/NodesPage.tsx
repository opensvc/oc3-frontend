import { useState } from "react";
import { DateTime } from "@/components/ui/DateTime";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { useFiltersets } from "@/lib/api/filtersets";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { TeamLink } from "@/features/groups/TeamLink";
import { NodeActionsMenu } from "./NodeActionsMenu";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { OsLogo } from "@/components/opensvc/OsLogo";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { formatSizeMiB } from "@/lib/format";
import {
  resolveListSearch,
  resetsScroll,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { CreateNodePanel } from "./CreateNodePanel";
import { NodeDetailPanel } from "./NodeDetailPanel";

type NodeRow = components["schemas"]["NodeRow"];

const DEFAULT_SORT = ["nodename"];

/**
 * Toutes les propriétés de node exposées par apicollector, dans l'ordre de son
 * `meta.available_props`. `satisfies` les confronte au schéma généré : un prop
 * renommé côté oc3 casse le typecheck au lieu de disparaître en silence.
 */
const NODE_PROPS = [
  "node_id",
  "nodename",
  "app",
  "node_env",
  "cluster_id",
  "loc_country",
  "loc_city",
  "loc_addr",
  "loc_building",
  "loc_floor",
  "loc_room",
  "loc_rack",
  "loc_zip",
  "cpu_freq",
  "cpu_cores",
  "cpu_dies",
  "cpu_vendor",
  "cpu_model",
  "cpu_threads",
  "mem_banks",
  "mem_slots",
  "mem_bytes",
  "os_name",
  "os_release",
  "os_update",
  "os_segment",
  "os_arch",
  "os_vendor",
  "os_kernel",
  "os_concat",
  "team_responsible",
  "team_integ",
  "team_support",
  "serial",
  "model",
  "manufacturer",
  "type",
  "assetname",
  "asset_env",
  "warranty_end",
  "maintenance_end",
  "status",
  "role",
  "sec_zone",
  "power_cabinet1",
  "power_cabinet2",
  "power_supply_nb",
  "power_protect",
  "power_protect_breaker",
  "power_breaker1",
  "power_breaker2",
  "blade_cabinet",
  "enclosure",
  "enclosureslot",
  "hv",
  "hvpool",
  "hvvdc",
  "fqdn",
  "connect_to",
  "listener_port",
  "version",
  "collector",
  "sp_version",
  "bios_version",
  "tz",
  "last_boot",
  "last_comm",
  "node_frozen",
  "node_frozen_at",
  "snooze_till",
  "notifications",
  "action_type",
  "hw_obs_warn_date",
  "hw_obs_alert_date",
  "os_obs_warn_date",
  "os_obs_alert_date",
  "updated",
] as const satisfies readonly (keyof NodeRow)[];

/** Colonnes affichées par défaut : de quoi identifier un node, pas de quoi l'auditer. */
const DEFAULT_COLS: string[] = ["nodename", "app", "node_env", "os_concat", "last_comm"];

/** Props entiers du mapping `node` d'oc3 (helper `colInt`), alignés à droite. */
const NUMERIC_PROPS = new Set<string>([
  "cpu_cores",
  "cpu_dies",
  "cpu_threads",
  "mem_banks",
  "mem_slots",
  "mem_bytes",
  "power_supply_nb",
  "listener_port",
]);

/** Props que le collector stocke en datetime. */
const DATE_PROPS = new Set<string>([
  "warranty_end",
  "maintenance_end",
  "last_boot",
  "last_comm",
  "node_frozen_at",
  "snooze_till",
  "hw_obs_warn_date",
  "hw_obs_alert_date",
  "os_obs_warn_date",
  "os_obs_alert_date",
  "updated",
]);

/**
 * Famille de chaque colonne, reprise du sélecteur de colonnes du collector
 * historique : l'icône dit de quoi parle la colonne, pas le type de sa valeur.
 */
const FAMILY: Record<string, ColumnFamily> = {
  node_id: "node",
  nodename: "node",
  app: "app",
  node_env: "env",
  cluster_id: "cluster",
  loc_country: "location",
  loc_city: "location",
  loc_addr: "location",
  loc_building: "location",
  loc_floor: "location",
  loc_room: "location",
  loc_rack: "location",
  loc_zip: "location",
  cpu_freq: "cpu",
  cpu_cores: "cpu",
  cpu_dies: "cpu",
  cpu_vendor: "cpu",
  cpu_model: "cpu",
  cpu_threads: "cpu",
  mem_banks: "memory",
  mem_slots: "memory",
  mem_bytes: "memory",
  os_name: "os",
  os_release: "os",
  os_update: "os",
  os_segment: "os",
  os_arch: "os",
  os_vendor: "os",
  os_kernel: "os",
  os_concat: "os",
  team_responsible: "team",
  team_integ: "team",
  team_support: "team",
  serial: "node",
  model: "node",
  manufacturer: "node",
  type: "node",
  assetname: "node",
  asset_env: "env",
  warranty_end: "time",
  maintenance_end: "time",
  status: "node",
  role: "node",
  sec_zone: "security",
  power_cabinet1: "power",
  power_cabinet2: "power",
  power_supply_nb: "power",
  power_protect: "power",
  power_protect_breaker: "power",
  power_breaker1: "power",
  power_breaker2: "power",
  blade_cabinet: "location",
  enclosure: "location",
  enclosureslot: "location",
  hv: "hypervisor",
  hvpool: "hypervisor",
  hvvdc: "hypervisor",
  fqdn: "node",
  connect_to: "network",
  listener_port: "service",
  version: "service",
  collector: "service",
  sp_version: "node",
  bios_version: "node",
  tz: "location",
  last_boot: "time",
  last_comm: "time",
  node_frozen: "node",
  node_frozen_at: "time",
  snooze_till: "alert",
  notifications: "alert",
  action_type: "service",
  hw_obs_warn_date: "time",
  hw_obs_alert_date: "time",
  os_obs_warn_date: "time",
  os_obs_alert_date: "time",
  updated: "time",
};

const COLUMNS: ListColumn<NodeRow>[] = NODE_PROPS.map((prop) => ({
  prop,
  labelKey: `nodes.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "node",
  render: (row: NodeRow, locale: string) => {
    const value = row[prop];
    // La colonne mémoire est en mébioctets malgré son nom, voir lib/format.
    if (prop === "mem_bytes") return formatSizeMiB(row.mem_bytes, locale);
    // Comme dans le collector historique, le logo du système précède le nom.
    if (prop === "team_responsible" || prop === "team_integ" || prop === "team_support")
      return <TeamLink name={value} />;
    if (prop === "app")
      return (
        <CrossLink kind="app" to="/apps" id={typeof value === "string" ? value : undefined}>
          {value}
        </CrossLink>
      );
    if (prop === "nodename")
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <OsLogo osName={row.os_name} />
          {row.nodename}
        </span>
      );
    // Ce qu'on lit du dernier contact, c'est son ancienneté : une date complète
    // obligerait à la soustraire de tête pour repérer un node qui ne parle plus.
    if (prop === "last_comm") return <RelativeTime value={row.last_comm} locale={locale} />;
    if (DATE_PROPS.has(prop) && typeof value === "string")
      return <DateTime value={value} locale={locale} />;
    return value;
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/**
 * Ne demander que les colonnes affichées : apicollector ne lit en base que les props
 * demandés. `os_name` s'y ajoute dès que le nom est affiché, pour son logo.
 */
function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, ALL_PROPS);
  const extra = shown.includes("nodename") ? ["os_name"] : [];
  return [...new Set(["node_id", ...shown, ...extra])].join(",");
}

function useNodes(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["nodes", search.sort, search.offset, search.limit, search.fset, search.cols],
    queryFn: async () => {
      // apicollector ne renvoie pas le total d'une sélection : on demande une ligne
      // de plus que la page pour savoir s'il en reste après celle-ci.
      const query = {
        props: queryProps(search.cols),
        orderby: search.sort.join(","),
        offset: search.offset,
        limit: search.limit + 1,
      };
      const response =
        search.fset === ""
          ? await api.GET("/nodes", { params: { query } })
          : await api.GET("/filtersets/{filterset_id}/nodes", {
              params: { path: { filterset_id: search.fset }, query },
            });
      if (response.error !== undefined) throw new Error(JSON.stringify(response.error));
      const all: NodeRow[] = Array.isArray(response.data.data) ? response.data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function NodesPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("nodes");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/nodes" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/nodes" });
  const { data, isPending, isError, error, isFetching } = useNodes(search);
  const filtersets = useFiltersets();
  const [creating, setCreating] = useState(false);
  // Sélection tenue par la liste ; la page n'en garde que les identifiants, pour le
  // menu d'actions. Les noms viennent de la page affichée, d'où le repli sur l'id.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /** Identifiants de toute la sélection, filterset compris, sans pagination. */
  async function allIds(): Promise<string[]> {
    const query = { props: "node_id", limit: 0 };
    const response =
      search.fset === ""
        ? await api.GET("/nodes", { params: { query } })
        : await api.GET("/filtersets/{filterset_id}/nodes", {
            params: { path: { filterset_id: search.fset }, query },
          });
    if (response.error !== undefined) throw new Error(JSON.stringify(response.error));
    const rows: NodeRow[] = Array.isArray(response.data.data) ? response.data.data : [];
    return rows.map((row) => row.node_id).filter((id): id is string => id !== undefined);
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

  const selected = data?.rows.find((row) => row.node_id === search.sel);
  // Noms de la page affichée : une sélection étendue aux pages suivantes ne les a
  // pas tous, l'identifiant sert alors de repli dans les messages.
  const nodeNames = Object.fromEntries(
    (data?.rows ?? []).map((row) => [row.node_id ?? "", row.nodename ?? ""]),
  );

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="node" className="h-5 w-5" />
          {t("nodes.title")}
        </h1>
        <button
          type="button"
          onClick={() => {
            // Les deux tiroirs partagent le bord droit : ouvrir la création ferme le détail.
            update({ sel: undefined });
            setCreating(true);
          }}
          className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink"
        >
          {t("nodes.create.open")}
        </button>
        <NodeActionsMenu nodes={selectedIds.map((id) => ({ id, name: nodeNames[id] ?? id }))} />
      </div>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => row.node_id}
        search={search}
        onChange={update}
        filtersets={filtersets.data ?? []}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        onSelectionChange={setSelectedIds}
        selectAllMatching={allIds}
      />

      <NodeDetailPanel
        nodeId={creating ? undefined : search.sel}
        nodename={selected?.nodename ?? ""}
        onClose={() => {
          update({ sel: undefined, tab: undefined });
        }}
        tab={search.tab}
        onTabChange={(tab) => {
          update({ tab });
        }}
      />

      <CreateNodePanel
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
      />
    </section>
  );
}
