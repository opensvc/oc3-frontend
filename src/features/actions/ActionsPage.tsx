import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { StatusBadge } from "@/components/opensvc/StatusBadge";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { DateTime } from "@/components/ui/DateTime";
import { RelativeTime } from "@/components/ui/RelativeTime";
import {
  resolveListSearch,
  resetsScroll,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { ActionDetailPanel } from "./ActionDetailPanel";
import { ActionQueueMenu } from "./ActionQueueMenu";
import { ACTION_PROPS, isPending, realDate, toActionRows, type ActionRow } from "./action-row";

/** La file se lit de la plus récente à la plus ancienne, comme le journal. */
const DEFAULT_SORT = ["-id"];

const DEFAULT_COLS: string[] = [
  "status",
  "command",
  "nodes.nodename",
  "services.svcname",
  "date_queued",
  "date_dequeued",
  "ret",
];

const FAMILY: Record<string, ColumnFamily> = {
  id: "state",
  status: "state",
  command: "state",
  "nodes.nodename": "node",
  "services.svcname": "service",
  action_type: "state",
  connect_to: "network",
  date_queued: "time",
  date_dequeued: "time",
  ret: "alert",
  stdout: "alert",
  stderr: "alert",
  node_id: "node",
  svc_id: "service",
};

/** Sortie d'agent : utile dans le panneau, illisible dans une cellule de table. */
const LONG_PROPS = new Set(["stdout", "stderr"]);

/**
 * État d'une action, du point de vue de qui la regarde : en attente tant que l'agent
 * ne l'a pas dépilée, puis selon son code de retour. Les codes de l'ancien collector
 * sont gardés tels quels, faute de libellés dans l'API.
 */
function statusState(row: ActionRow): "up" | "warn" | "down" | "unknown" {
  if (isPending(row.status)) return "warn";
  if (row.status === "C") return "unknown";
  return row.ret === "0" ? "up" : "down";
}

const COLUMNS: ListColumn<ActionRow>[] = ACTION_PROPS.map((prop) => ({
  prop,
  labelKey: `actions.fields.${prop}`,
  numeric: prop === "id" || prop === "ret",
  family: FAMILY[prop] ?? "state",
  // `orderby` n'accepte pas les props joints, et la sortie ne se trie pas utilement.
  sortable: !prop.includes(".") && !LONG_PROPS.has(prop),
  render: (row: ActionRow, locale: string) => {
    const value = row[prop];
    if (prop === "status") return <StatusBadge state={statusState(row)} label={row.status} />;
    if (prop === "command") return <code className="text-data">{value}</code>;
    if (prop === "nodes.nodename")
      return (
        <CrossLink kind="node" id={row.node_id}>
          {value}
        </CrossLink>
      );
    if (prop === "services.svcname")
      return (
        <CrossLink kind="service" id={row.svc_id}>
          {value}
        </CrossLink>
      );
    if (prop === "date_queued") return <RelativeTime value={realDate(value)} locale={locale} />;
    if (prop === "date_dequeued") {
      const date = realDate(value);
      return date === undefined ? undefined : <DateTime value={date} locale={locale} />;
    }
    if (LONG_PROPS.has(prop)) return <span className="line-clamp-1">{value}</span>;
    return value;
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/** Colonnes affichées, plus ce dont les puces et l'état ont besoin. */
function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, ALL_PROPS);
  return [...new Set(["id", "status", "ret", "node_id", "svc_id", ...shown])].join(",");
}

function useActions(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["actions", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
      const { data, error } = await api.GET("/actions", {
        params: {
          query: {
            props: queryProps(search.cols),
            orderby: search.sort.join(","),
            offset: search.offset,
            limit: search.limit + 1,
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const all = toActionRows(data.data);
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function ActionsPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("actions");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/actions" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/actions" });
  const { data, isPending: loading, isError, error, isFetching } = useActions(search);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Une action se nomme par sa commande dans les messages ; l'identifiant sinon.
  const commands = Object.fromEntries((data?.rows ?? []).map((row) => [row.id, row.command]));

  async function allIds(): Promise<string[]> {
    const { data: page, error: failure } = await api.GET("/actions", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (failure !== undefined) throw new Error(problemText(failure));
    return toActionRows(page.data).map((row) => row.id);
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

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="log" className="h-5 w-5" />
          {t("actions.title")}
        </h1>
        <ActionQueueMenu actions={selectedIds.map((id) => ({ id, name: commands[id] ?? id }))} />
      </div>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => row.id}
        search={search}
        onChange={update}
        // apicollector n'a pas d'endpoint d'actions filtré par filterset.
        filtersets={[]}
        isPending={loading}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        onSelectionChange={setSelectedIds}
        selectAllMatching={allIds}
      />

      <ActionDetailPanel
        actionId={search.sel}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
