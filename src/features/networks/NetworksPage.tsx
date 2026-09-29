import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "@/components/ui/DateTime";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { toPage } from "@/lib/api/page";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import {
  resolveListSearch,
  resetsScroll,
  mergeSearch,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { CreateNetworkPanel } from "./CreateNetworkPanel";
import { NetworkDetailPanel } from "./NetworkDetailPanel";

type IpRow = components["schemas"]["IpRow"];
type NetworkRow = components["schemas"]["NetworkRow"];

/**
 * Empty: apicollector refuses any `orderby` on this endpoint. The `node_ip` mapping
 * describes its props by a SQL expression without a column reference, and
 * `buildOrderBy` requires that reference — "prop "addr" cannot be used in orderby (no
 * column reference)". The server then sorts by address, its default order.
 */
const DEFAULT_SORT: string[] = [];

/**
 * Every property exposed by apicollector for an address, in the order of its
 * `meta.available_props`. A row is an address read on a node, joined to the
 * definition of the network it belongs to: hence the `net_` prefixes. `satisfies`
 * confronts them with the generated schema.
 */
const IP_PROPS = [
  "id",
  "node_id",
  "nodename",
  "intf",
  "mac",
  "type",
  "addr",
  "mask",
  "updated",
  "flag_deprecated",
  "net_id",
  "net_name",
  "net_network",
  "net_netmask",
  "net_broadcast",
  "net_gateway",
  "net_begin",
  "net_end",
  "net_pvid",
  "net_prio",
  "net_comment",
  "net_team_responsible",
] as const satisfies readonly (keyof IpRow)[];

/**
 * Default columns: enough to place an address. The name of the node rather than its
 * id, unlike the server's default.
 */
const DEFAULT_COLS: string[] = ["nodename", "intf", "addr", "mask", "type", "net_name"];

/** Integer props of the oc3 `node_ip` mapping (`Kind: "int64"`), aligned right. */
const NUMERIC_PROPS = new Set<string>(["id", "net_id", "net_prio", "flag_deprecated"]);

/** Props the collector stores as datetime. */
const DATE_PROPS = new Set<string>(["updated"]);

/** Family of each column, in the vocabulary of the historical collector. */
const FAMILY: Record<string, ColumnFamily> = {
  id: "network",
  node_id: "node",
  nodename: "node",
  intf: "network",
  mac: "network",
  type: "network",
  addr: "network",
  mask: "network",
  updated: "time",
  flag_deprecated: "network",
  net_id: "network",
  net_name: "network",
  net_network: "network",
  net_netmask: "network",
  net_broadcast: "network",
  net_gateway: "network",
  net_begin: "network",
  net_end: "network",
  net_pvid: "network",
  net_prio: "network",
  net_comment: "network",
  net_team_responsible: "team",
};

const COLUMNS: ListColumn<IpRow>[] = IP_PROPS.map((prop) => ({
  prop,
  labelKey: `networks.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "node",
  // No column can be sorted as long as the endpoint refuses `orderby`.
  sortable: false,
  render: (row: IpRow, locale: string) => {
    const value = row[prop];
    if (prop === "nodename")
      return (
        <CrossLink kind="node" id={row.node_id}>
          {value}
        </CrossLink>
      );
    if (DATE_PROPS.has(prop) && typeof value === "string")
      return <DateTime value={value} locale={locale} />;
    return value;
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/**
 * Columns shown and the id, plus the node's when its name is shown: that one is a
 * badge which opens the Nodes view on this node.
 */
function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, ALL_PROPS);
  const extra = shown.includes("nodename") ? ["node_id"] : [];
  return [...new Set(["id", ...shown, ...extra])].join(",");
}

function useIps(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["ips", search.offset, search.limit, search.cols],
    queryFn: async () => {
      // One row more than the page: apicollector does not return the total of a selection.
      const { data, error } = await api.GET("/ips", {
        params: {
          query: {
            props: queryProps(search.cols),
            offset: search.offset,
            limit: search.limit + 1,
          },
        },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const all: IpRow[] = Array.isArray(data.data) ? data.data : [];
      return toPage(all, data.meta, search.limit);
    },
  });
}

export function NetworksPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("networks");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/networks" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/networks" });
  const { data, isPending, isError, error, isFetching } = useIps(search);

  /** Ids of the whole selection, without pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/ips", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: IpRow[] = Array.isArray(data.data) ? data.data : [];
    return rows
      .map((row) => row.id)
      .filter((id): id is number => id !== undefined)
      .map(String);
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

  const selected = data?.rows.find((row) => String(row.id) === search.sel);
  const [creating, setCreating] = useState(false);
  // A created network only shows through its addresses: its creation is confirmed here.
  const [created, setCreated] = useState<NetworkRow | null>(null);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="network" className="h-5 w-5" />
          {t("networks.title")}
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
          {t("networks.create.open")}
        </button>
        {created !== null && (
          <span role="status" className="text-ink-muted">
            ●{" "}
            {t("networks.create.done", {
              name:
                created.name === "" || created.name === undefined
                  ? `${created.network ?? ""}/${String(created.netmask ?? "")}`
                  : created.name,
              range: `${created.begin ?? ""} – ${created.end ?? ""}`,
            })}
          </span>
        )}
      </div>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        // The collector's filtersets do not apply to addresses.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        total={data?.total}
        selectAllMatching={allIds}
      />

      <CreateNetworkPanel
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
        onCreated={setCreated}
      />

      <NetworkDetailPanel
        ipId={creating ? undefined : search.sel}
        label={selected?.addr ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
