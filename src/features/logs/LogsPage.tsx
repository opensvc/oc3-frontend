import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { useFiltersets } from "@/lib/api/filtersets";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { OsLogo } from "@/components/opensvc/OsLogo";
import { StatusBadge } from "@/components/opensvc/StatusBadge";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { DateTime } from "@/components/ui/DateTime";
import {
  resolveListSearch,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { LogDetailPanel } from "./LogDetailPanel";
import { formatLogMessage, logLevelState } from "./log-message";

type LogRow = components["schemas"]["LogRow"];

/**
 * Par date, du plus récent au plus ancien. Beaucoup de journaux partagent la même
 * seconde : l'identifiant, croissant avec l'écriture, les départage dans le même
 * ordre, sans quoi la pagination pourrait répéter ou sauter des lignes à égalité.
 */
const DEFAULT_SORT = ["-log_date", "-id"];

/**
 * Propriétés exposées par apicollector, noms joints compris. `log_fmt` porte la
 * colonne « Message » : elle affiche le format complété par `log_dict`.
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

/** Colonnes par défaut : celles de la table historique (`default_columns`). */
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
 * Colonnes affichées et identifiant ; le message a besoin des valeurs de `log_dict`,
 * et le nom du node de son OS pour le logo.
 */
function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, [...LOG_PROPS]);
  const extra = [
    ...(shown.includes("log_fmt") ? ["log_dict"] : []),
    ...(shown.includes("nodes.nodename") ? ["nodes.os_name"] : []),
  ];
  return [...new Set(["id", ...shown, ...extra])].join(",");
}

function useLogs(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["logs", search.sort, search.offset, search.limit, search.fset, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
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
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function LogsPage() {
  const { t } = useTranslation();
  const search = resolveListSearch(useSearch({ from: "/logs" }), DEFAULT_SORT);
  const navigate = useNavigate({ from: "/logs" });
  const { data, isPending, isError, error, isFetching } = useLogs(search);
  const filtersets = useFiltersets();

  /** Identifiants de toute la sélection, filterset compris, sans pagination. */
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
    void navigate({ search: (previous) => ({ ...previous, ...toSearchParams(next) }) });
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
      if (prop === "nodes.nodename")
        return value === null || value === undefined ? undefined : (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <OsLogo osName={row["nodes.os_name"] ?? undefined} />
            {value}
          </span>
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
