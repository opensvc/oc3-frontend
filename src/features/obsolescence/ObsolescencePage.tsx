import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { DateTime } from "@/components/ui/DateTime";
import { RefreshIcon } from "@/components/ui/icons";
import {
  resolveListSearch,
  resetsScroll,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { ObsolescenceDetailPanel } from "./ObsolescenceDetailPanel";

type ObsolescenceSettingRow = components["schemas"]["ObsolescenceSettingRow"];

/**
 * Empty: apicollector refuses any `orderby` on this endpoint. The `obsolescence`
 * mapping describes its props only by SQL expressions over the `v_obsolescence` view,
 * without the column reference `buildOrderBy` requires.
 */
const DEFAULT_SORT: string[] = [];

const OBSOLESCENCE_PROPS = [
  "id",
  "obs_type",
  "obs_name",
  "obs_count",
  "obs_warn_date",
  "obs_alert_date",
  "obs_warn_date_updated_by",
  "obs_warn_date_updated",
  "obs_alert_date_updated_by",
  "obs_alert_date_updated",
] as const satisfies readonly (keyof ObsolescenceSettingRow)[];

/** Default columns: what the setting aims at, how many nodes, and its two deadlines. */
const DEFAULT_COLS: string[] = [
  "obs_type",
  "obs_name",
  "obs_count",
  "obs_warn_date",
  "obs_alert_date",
];

const NUMERIC_PROPS = new Set<string>(["id", "obs_count"]);

/** Deadlines entered by the day: the time carries nothing there. */
const DEADLINE_PROPS = new Set<string>(["obs_warn_date", "obs_alert_date"]);
const TIMESTAMP_PROPS = new Set<string>(["obs_warn_date_updated", "obs_alert_date_updated"]);

const FAMILY: Record<string, ColumnFamily> = {
  id: "node",
  obs_type: "node",
  obs_name: "node",
  obs_count: "node",
  obs_warn_date: "alert",
  obs_alert_date: "alert",
  obs_warn_date_updated_by: "team",
  obs_warn_date_updated: "time",
  obs_alert_date_updated_by: "team",
  obs_alert_date_updated: "time",
};

const ALL_PROPS = [...OBSOLESCENCE_PROPS];

/** Columns shown, plus the id used by the detail. */
function queryProps(cols: string[] | undefined): string {
  return [...new Set(["id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

function useSettings(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["obsolescence", search.offset, search.limit, search.cols],
    queryFn: async () => {
      // One row more than the page: apicollector does not return the total of a selection.
      const { data, error } = await api.GET("/obsolescence/settings", {
        params: {
          query: {
            props: queryProps(search.cols),
            offset: search.offset,
            limit: search.limit + 1,
          },
        },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const all: ObsolescenceSettingRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function ObsolescencePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const prefs = useViewPrefs("obsolescence");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/obsolescence" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/obsolescence" });
  const { data, isPending, isError, error, isFetching } = useSettings(search);

  /**
   * Creating the missing settings. The collector does not create a setting by hand:
   * it adds one for each hardware model and each OS version reported by the nodes
   * that do not have one yet, like the "refresh obsolescence" action of the
   * historical collector. Existing settings and their dates are left untouched.
   */
  const refresh = useMutation({
    mutationFn: async () => {
      const { error: failure } = await api.PUT("/obsolescence/refresh");
      if (failure !== undefined) throw new Error(problemText(failure));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["obsolescence"] });
    },
  });

  /** Ids of the whole selection, without pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/obsolescence/settings", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: ObsolescenceSettingRow[] = Array.isArray(data.data) ? data.data : [];
    return rows
      .map((row) => row.id)
      .filter((id): id is number => id !== undefined)
      .map(String);
  }

  function update(next: Partial<ResolvedListSearch>) {
    // Columns and sort follow the account, the other states stay in the URL.
    if ("cols" in next) prefs.saveCols(next.cols);
    if ("sort" in next) prefs.saveSort(next.sort);
    void navigate({
      search: (previous) => ({ ...previous, ...toSearchParams(next) }),
      resetScroll: resetsScroll(next),
    });
  }

  const columns: ListColumn<ObsolescenceSettingRow>[] = OBSOLESCENCE_PROPS.map((prop) => ({
    prop,
    labelKey: `obsolescence.fields.${prop}`,
    numeric: NUMERIC_PROPS.has(prop),
    family: FAMILY[prop] ?? "node",
    // Aucune colonne n'est triable tant que l'endpoint refuse `orderby`.
    sortable: false,
    render: (row: ObsolescenceSettingRow, locale: string) => {
      const value = row[prop];
      if (prop === "obs_type" && row.obs_type !== undefined)
        return t(`obsolescence.type.${row.obs_type}`);
      if (DEADLINE_PROPS.has(prop) && typeof value === "string")
        return <DateTime value={value} locale={locale} dateOnly />;
      if (TIMESTAMP_PROPS.has(prop) && typeof value === "string")
        return <DateTime value={value} locale={locale} />;
      return value;
    },
  }));

  const selected = data?.rows.find((row) => String(row.id) === search.sel);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="obsolescence" className="h-5 w-5" />
          {t("obsolescence.title")}
        </h1>
        <button
          type="button"
          disabled={refresh.isPending}
          title={t("obsolescence.refresh.hint")}
          onClick={() => {
            refresh.mutate();
          }}
          className="flex h-7 items-center gap-1.5 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          <RefreshIcon className="h-3.5 w-3.5" />
          {refresh.isPending ? t("obsolescence.refresh.pending") : t("obsolescence.refresh.open")}
        </button>
        <span aria-live="polite" className="text-ink-muted">
          {refresh.isSuccess && t("obsolescence.refresh.done")}
        </span>
        {refresh.isError && (
          <span role="alert" className="text-state-down">
            ■ {refresh.error.message}
          </span>
        )}
      </div>
      <p className="mb-3 max-w-3xl text-ink-muted">{t("obsolescence.intro")}</p>

      <CollectorList
        columns={columns}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        // The collector filtersets do not bear on these settings.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        selectAllMatching={allIds}
      />

      <ObsolescenceDetailPanel
        settingId={search.sel}
        label={selected?.obs_name ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
