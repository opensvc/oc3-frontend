import { useState } from "react";
import { DateTime } from "@/components/ui/DateTime";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { toPage } from "@/lib/api/page";
import { problemText } from "@/lib/api/problem";
import { useFiltersets } from "@/lib/api/filtersets";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { TeamLink } from "@/features/groups/TeamLink";
import { NodeActionsMenu } from "./NodeActionsMenu";
import { FrozenMark } from "@/components/opensvc/FrozenMark";
import { frozenFilterOptions } from "@/components/opensvc/filter-options";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { OsLogo } from "@/components/opensvc/OsLogo";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { formatSizeMiB } from "@/lib/format";
import {
  resolveListSearch,
  resetsScroll,
  mergeSearch,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { filterQuery, filtersKey } from "@/lib/column-filters";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { CreateNodePanel } from "./CreateNodePanel";
import { NODE_PROPS } from "./node-props";
import { NodeDetailPanel } from "./NodeDetailPanel";

type NodeRow = components["schemas"]["NodeRow"];

const DEFAULT_SORT = ["nodename"];

/** Columns shown by default: enough to identify a node, not to audit it. */
const DEFAULT_COLS: string[] = ["nodename", "app", "node_env", "os_concat", "last_comm"];

/** Integer props of the oc3 `node` mapping (the `colInt` helper), aligned right. */
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

/** Props the collector stores as datetime. */
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
 * Family of each column, taken from the column picker of the historical collector:
 * the icon says what the column speaks of, not the type of its value.
 */
const FAMILY: Record<string, ColumnFamily> = {
  node_id: "node",
  nodename: "node",
  app: "app",
  node_env: "env",
  cluster_id: "cluster",
  "clusters.cluster_name": "cluster",
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
  filter:
    prop === "node_frozen"
      ? { kind: "enum" as const, options: frozenFilterOptions("T", "F") }
      : undefined,
  render: (row: NodeRow, locale: string) => {
    const value = row[prop];
    // The memory column is in mebibytes despite its name, see lib/format.
    if (prop === "mem_bytes") return formatSizeMiB(row.mem_bytes, locale);
    // As in the historical collector, the system logo precedes the name.
    if (prop === "team_responsible" || prop === "team_integ" || prop === "team_support")
      return <TeamLink name={value} />;
    if (prop === "app")
      return (
        <CrossLink kind="app" id={typeof value === "string" ? value : undefined}>
          {value}
        </CrossLink>
      );
    // The logo goes with the name of the system, and with it alone: the full version
    // (`os_concat`) would repeat it without saying anything more.
    if (prop === "os_name")
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <OsLogo osName={row.os_name} />
          {value}
        </span>
      );
    // What one reads from the last contact is its age: a full date would have to be
    // subtracted mentally to spot a node that has stopped speaking.
    if (prop === "last_comm") return <RelativeTime value={row.last_comm} locale={locale} />;
    if (DATE_PROPS.has(prop) && typeof value === "string")
      return <DateTime value={value} locale={locale} />;
    return value;
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/**
 * Ask only for the columns shown: apicollector reads from the database only the props
 * requested.
 */
/** `node_frozen` is always requested: freezing is marked even with the column hidden. */
function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, ALL_PROPS);
  return [...new Set(["node_id", "node_frozen", ...shown])].join(",");
}

function useNodes(search: ResolvedListSearch) {
  return useQuery({
    queryKey: [
      "nodes",
      search.sort,
      search.offset,
      search.limit,
      search.fset,
      search.cols,
      filtersKey(search.filters),
    ],
    // The rows on display stay while the next ones load: typing a filter must not
    // empty the table under the field.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // apicollector does not return the total of a selection: one row more than the
      // page is requested, to know whether any remain after it.
      const query = {
        props: queryProps(search.cols),
        orderby: search.sort.join(","),
        offset: search.offset,
        limit: search.limit + 1,
        filter: filterQuery(search.filters),
      };
      const response =
        search.fset === ""
          ? await api.GET("/nodes", { params: { query } })
          : await api.GET("/filtersets/{filterset_id}/nodes", {
              params: { path: { filterset_id: search.fset }, query },
            });
      if (response.error !== undefined) throw new Error(problemText(response.error));
      const all: NodeRow[] = Array.isArray(response.data.data) ? response.data.data : [];
      return toPage(all, response.data.meta, search.limit);
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
  // Selection held by the list; the page keeps only its ids, for the actions menu.
  // The names come from the page on display, hence the fallback to the id.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /** Ids of the whole selection, filterset and filters included, without pagination. */
  async function allIds(): Promise<string[]> {
    const query = { props: "node_id", limit: 0, filter: filterQuery(search.filters) };
    const response =
      search.fset === ""
        ? await api.GET("/nodes", { params: { query } })
        : await api.GET("/filtersets/{filterset_id}/nodes", {
            params: { path: { filterset_id: search.fset }, query },
          });
    if (response.error !== undefined) throw new Error(problemText(response.error));
    const rows: NodeRow[] = Array.isArray(response.data.data) ? response.data.data : [];
    return rows.map((row) => row.node_id).filter((id): id is string => id !== undefined);
  }

  function update(next: Partial<ResolvedListSearch>) {
    // Choosing a row ends a creation in progress: the row's detail takes the right

    // edge, where the two drawers would otherwise overlap.

    if (next.sel !== undefined) setCreating(false);
    // Columns, sort, filters and page size follow the account, the other states
    // stay in the URL.
    prefs.saveSearch(next);
    void navigate({
      search: (previous) => mergeSearch(previous, next),
      resetScroll: resetsScroll(next),
    });
  }

  const selected = data?.rows.find((row) => row.node_id === search.sel);
  // Names from the page on display: a selection extended to the following pages does
  // not have them all, so the id then serves as a fallback in the messages.
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
            // The two drawers share the right edge: opening the creation closes the detail.
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
        total={data?.total}
        rowLead={(row) => <FrozenMark frozen={row.node_frozen === "T"} />}
        onSelectionChange={setSelectedIds}
        selectAllMatching={allIds}
        filterable
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
