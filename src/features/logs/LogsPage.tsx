import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { toPage } from "@/lib/api/page";
import { useFiltersets } from "@/lib/api/filtersets";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { StatusBadge } from "@/components/opensvc/StatusBadge";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { DateTime } from "@/components/ui/DateTime";
import {
  resolveListSearch,
  resetsScroll,
  mergeSearch,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { LogDetailPanel } from "./LogDetailPanel";
import { formatLogMessage, logLevelState } from "./log-message";

type LogRow = components["schemas"]["LogRow"];

/**
 * By date, from the most recent to the oldest. Many log entries share the same
 * second: the id, which grows with writing, breaks the tie in the same order, without
 * which pagination could repeat or skip rows on equal dates.
 */
const DEFAULT_SORT = ["-log_date", "-id"];

/**
 * Properties exposed by apicollector, joined names included. `log_fmt` carries the
 * "Message" column: it shows the format filled in from `log_dict`.
 */
const LOG_PROPS = [
  "log_date",
  "log_level",
  "services.svcname",
  "nodes.nodename",
  "log_user",
  "log_action",
  "log_fmt",
  "log_dict",
  "id",
  "svc_id",
  "node_id",
  "log_entry_id",
  "log_gtalk_sent",
  "log_email_sent",
] as const satisfies readonly (keyof LogRow)[];

/** Default columns: those of the historical table (`default_columns`). */
const DEFAULT_COLS: string[] = [
  "log_date",
  "log_level",
  "services.svcname",
  "nodes.nodename",
  "log_user",
  "log_action",
  "log_fmt",
];

const NUMERIC_PROPS = new Set<string>(["id", "log_entry_id", "log_gtalk_sent", "log_email_sent"]);

const FAMILY: Record<string, ColumnFamily> = {
  log_date: "time",
  log_level: "alert",
  "services.svcname": "service",
  "nodes.nodename": "node",
  log_user: "team",
  log_action: "state",
  log_fmt: "alert",
  log_dict: "alert",
  id: "state",
  svc_id: "service",
  node_id: "node",
  log_entry_id: "state",
  log_gtalk_sent: "alert",
  log_email_sent: "alert",
};

/**
 * Columns shown and the id; the message needs the values from `log_dict`, and the
 * name of the node needs its OS for the logo.
 */
function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, [...LOG_PROPS]);
  const extra = [
    ...(shown.includes("log_fmt") ? ["log_dict"] : []),
    // The joined names are badges towards their view: they need their id.
    ...(shown.includes("nodes.nodename") ? ["node_id"] : []),
    ...(shown.includes("services.svcname") ? ["svc_id"] : []),
  ];
  return [...new Set(["id", ...shown, ...extra])].join(",");
}

function useLogs(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["logs", search.sort, search.offset, search.limit, search.fset, search.cols],
    queryFn: async () => {
      // One row more than the page: apicollector does not return the total of a selection.
      const { data, error } = await api.GET("/logs", {
        params: {
          query: {
            props: queryProps(search.cols),
            orderby: search.sort.join(","),
            offset: search.offset,
            limit: search.limit + 1,
            ...(search.fset === "" ? {} : { fset_id: search.fset }),
          },
        },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const all: LogRow[] = Array.isArray(data.data) ? data.data : [];
      return toPage(all, data.meta, search.limit);
    },
  });
}

export function LogsPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("logs");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/logs" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/logs" });
  const { data, isPending, isError, error, isFetching } = useLogs(search);
  const filtersets = useFiltersets();

  /** Ids of the whole selection, filterset included, without pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/logs", {
      params: {
        query: {
          props: "id",
          limit: 0,
          ...(search.fset === "" ? {} : { fset_id: search.fset }),
        },
      },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: LogRow[] = Array.isArray(data.data) ? data.data : [];
    return rows
      .map((row) => row.id)
      .filter((id): id is number => id !== undefined)
      .map(String);
  }

  function update(next: Partial<ResolvedListSearch>) {
    // Columns, sort, filters and page size follow the account, the other states
    // stay in the URL.
    prefs.saveSearch(next);
    void navigate({
      search: (previous) => mergeSearch(previous, next),
      resetScroll: resetsScroll(next),
    });
  }

  const columns: ListColumn<LogRow>[] = LOG_PROPS.map((prop) => ({
    prop,
    labelKey: `logs.fields.${prop}`,
    numeric: NUMERIC_PROPS.has(prop),
    family: FAMILY[prop] ?? "state",
    render: (row: LogRow, locale: string) => {
      const value = row[prop];
      if (prop === "log_date") return <DateTime value={row.log_date} locale={locale} />;
      if (prop === "log_level")
        return row.log_level === undefined ? undefined : (
          <StatusBadge state={logLevelState(row.log_level)} label={row.log_level} />
        );
      if (prop === "services.svcname")
        return value === null || value === undefined ? undefined : (
          <CrossLink kind="service" id={row.svc_id}>
            {value}
          </CrossLink>
        );
      if (prop === "nodes.nodename")
        return value === null || value === undefined ? undefined : (
          <CrossLink kind="node" id={row.node_id}>
            {value}
          </CrossLink>
        );
      if (prop === "log_fmt") {
        const message = formatLogMessage(row.log_fmt, row.log_dict);
        return message.corrupted ? (
          <span title={t("logs.corrupted")}>
            {message.parts} <span className="text-state-warn">▲ {t("logs.corrupted")}</span>
          </span>
        ) : (
          <span>{message.parts}</span>
        );
      }
      return value;
    },
  }));

  const selected = data?.rows.find((row) => String(row.id) === search.sel);

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="log" className="h-5 w-5" />
          {t("logs.title")}
        </h1>
      </div>

      <CollectorList
        columns={columns}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        filtersets={filtersets.data ?? []}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        total={data?.total}
        selectAllMatching={allIds}
      />

      <LogDetailPanel
        logId={search.sel}
        label={selected?.log_action ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
