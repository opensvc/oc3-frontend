import { useQuery } from "@tanstack/react-query";
import { DateTime } from "@/components/ui/DateTime";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { useFiltersets } from "@/lib/api/filtersets";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { SeverityBadge } from "@/components/opensvc/SeverityBadge";
import {
  resolveListSearch,
  resetsScroll,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { AlertDetailPanel } from "./AlertDetailPanel";

type AlertRow = components["schemas"]["AlertRow"];

/** Le dashboard historique trie par sévérité décroissante, puis par type. */
const DEFAULT_SORT = ["-dash_severity", "dash_type"];

/** Nom de l'objet visé : une entrée porte soit un service, soit un node. */
function objectName(row: AlertRow): string {
  return row["services.svcname"] ?? row["nodes.nodename"] ?? "";
}

const COLUMNS: ListColumn<AlertRow>[] = [
  {
    prop: "dash_severity",
    labelKey: "alerts.fields.dash_severity",
    family: "alert",
    render: (r) => <SeverityBadge severity={r.dash_severity ?? 0} />,
  },
  {
    prop: "dash_type",
    labelKey: "alerts.fields.dash_type",
    family: "alert",
    render: (r) => r.dash_type,
  },
  {
    prop: "services.svcname",
    labelKey: "alerts.fields.object",
    family: "service",
    // orderby n'accepte pas les props joints : cette colonne n'est pas triable.
    sortable: false,
    // L'alerte porte un service ou un node : la puce mène à celui qui la porte.
    render: (r) =>
      r.svc_id !== undefined && r.svc_id !== "" ? (
        <CrossLink kind="service" to="/services" id={r.svc_id}>
          {objectName(r)}
        </CrossLink>
      ) : (
        <CrossLink kind="node" to="/nodes" id={r.node_id}>
          {objectName(r)}
        </CrossLink>
      ),
  },
  {
    prop: "dash_env",
    labelKey: "alerts.fields.dash_env",
    family: "env",
    render: (r) => r.dash_env,
  },
  {
    prop: "alert",
    labelKey: "alerts.fields.alert",
    family: "alert",
    sortable: false,
    render: (r) => r.alert,
  },
  {
    prop: "dash_created",
    labelKey: "alerts.fields.dash_created",
    family: "time",
    render: (r, locale) => <DateTime value={r.dash_created} locale={locale} />,
  },
  {
    prop: "dash_updated",
    labelKey: "alerts.fields.dash_updated",
    family: "time",
    render: (r, locale) => <DateTime value={r.dash_updated} locale={locale} />,
  },
];

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/** Cette vue déclare peu de colonnes : toutes sont affichées par défaut. */
const DEFAULT_COLS = ALL_PROPS;

function queryProps(cols: string[] | undefined): string {
  const shown = visibleProps(cols, DEFAULT_COLS, ALL_PROPS);
  // La colonne « objet » lit les deux noms joints, et l'identifiant sert au détail.
  const extra = shown.includes("services.svcname") ? ["nodes.nodename", "svc_id", "node_id"] : [];
  return ["id", ...shown, ...extra].join(",");
}

function useAlerts(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["alerts", search.sort, search.offset, search.limit, search.fset, search.cols],
    queryFn: async () => {
      const query = {
        props: queryProps(search.cols),
        orderby: search.sort.join(","),
        offset: search.offset,
        limit: search.limit + 1,
      };
      const { data, error } = await api.GET("/alerts", { params: { query } });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const all: AlertRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

/** Répartition par sévérité, sur l'ensemble des entrées et non sur la page courante. */
function useSeverityCounts() {
  return useQuery({
    queryKey: ["alerts", "severity-counts"],
    queryFn: async () => {
      const { data, error } = await api.GET("/alerts", {
        // `stats` est déclaré en chaîne dans la spec, pas en booléen.
        params: { query: { props: "dash_severity", stats: "true", limit: 0 } },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const distinct = Array.isArray(data.data) ? {} : data.data;
      const counts = distinct.dash_severity ?? {};
      return Object.entries(counts)
        .map(([severity, count]) => ({ severity: Number(severity), count }))
        .sort((a, b) => b.severity - a.severity);
    },
  });
}

export function DashboardPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("dashboard");
  const search = resolveListSearch(withSavedSearch(useSearch({ from: "/" }), prefs), DEFAULT_SORT);
  const navigate = useNavigate({ from: "/" });
  const { data, isPending, isError, error, isFetching } = useAlerts(search);
  const severities = useSeverityCounts();
  const filtersets = useFiltersets();

  /** Identifiants de toute la sélection, sans pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/alerts", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: AlertRow[] = Array.isArray(data.data) ? data.data : [];
    return rows
      .map((row) => row.id)
      .filter((id): id is number => id !== undefined)
      .map(String);
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

  const selected = data?.rows.find((row) => String(row.id) === search.sel);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="dashboard" className="h-5 w-5" />
          {t("dashboard.title")}
        </h1>
        {(severities.data ?? []).map((entry) => (
          <span key={entry.severity} className="flex items-center gap-1 text-ink-muted">
            <SeverityBadge severity={entry.severity} />
            {entry.count}
          </span>
        ))}
      </div>

      <CollectorList
        columns={COLUMNS}
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

      <AlertDetailPanel
        alertId={search.sel}
        label={selected === undefined ? "" : (selected.dash_type ?? "")}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
