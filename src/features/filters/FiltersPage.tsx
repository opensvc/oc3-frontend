import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
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
import { FilterDetailPanel } from "./FilterDetailPanel";
import { FilterFormPanel } from "./FilterFormPanel";
import { useFilter } from "./use-filter";

type FilterRow = components["schemas"]["FilterRow"];

/** Grouped by table then by column: the filters of one column follow each other. */
const DEFAULT_SORT = ["f_table", "f_field", "f_value"];

const FILTER_PROPS = [
  "f_label",
  "f_table",
  "f_field",
  "f_op",
  "f_value",
  "f_author",
  "f_updated",
  "id",
  "f_cksum",
] as const satisfies readonly (keyof FilterRow)[];

/** Default columns: the definition, and who touched it last. */
const DEFAULT_COLS: string[] = ["f_table", "f_field", "f_op", "f_value", "f_author", "f_updated"];

const NUMERIC_PROPS = new Set<string>(["id"]);

const FAMILY: Record<string, ColumnFamily> = {
  f_label: "state",
  f_table: "state",
  f_field: "state",
  f_op: "state",
  f_value: "state",
  f_author: "team",
  f_updated: "time",
  id: "state",
  f_cksum: "state",
};

const COLUMNS: ListColumn<FilterRow>[] = FILTER_PROPS.map((prop) => ({
  prop,
  labelKey: `filters.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "state",
  render: (row: FilterRow, locale: string) => {
    if (prop === "f_updated") return <DateTime value={row.f_updated} locale={locale} />;
    // The operator and the value read in a monospace font: a space or a LIKE "%" must
    // not go unnoticed.
    if (prop === "f_op" || prop === "f_value")
      return <code className="whitespace-pre">{row[prop]}</code>;
    return row[prop];
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

function queryProps(cols: string[] | undefined): string {
  return [...new Set(["id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

function useFilters(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["filters", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // One row more than the page: apicollector does not return the total of a selection.
      const { data, error } = await api.GET("/filters", {
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
      const all: FilterRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function FiltersPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("filters");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/filters" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/filters" });
  const { data, isPending, isError, error, isFetching } = useFilters(search);
  // A single form: creation when nothing is selected, editing otherwise.
  const [form, setForm] = useState<"create" | "edit" | null>(null);
  const selectedFilter = useFilter(form === "edit" ? search.sel : undefined);

  /** Ids of the whole selection, without pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/filters", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: FilterRow[] = Array.isArray(data.data) ? data.data : [];
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
      search: (previous) => mergeSearch(previous, next),
      resetScroll: resetsScroll(next),
    });
  }

  const selected = data?.rows.find((row) => String(row.id) === search.sel);

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="filter" className="h-5 w-5" />
          {t("filters.title")}
        </h1>
        <button
          type="button"
          onClick={() => {
            // The drawers share the right edge: opening the creation closes the detail.
            update({ sel: undefined });
            setForm("create");
          }}
          className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink"
        >
          {t("filters.form.open")}
        </button>
      </div>
      <p className="mb-3 max-w-3xl text-ink-muted">{t("filters.intro")}</p>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        // A filter is not filtered by a filterset: filtersets are made of filters.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        selectAllMatching={allIds}
      />

      <FilterDetailPanel
        filterId={form === null ? search.sel : undefined}
        label={selected?.f_label ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
        onEdit={() => {
          setForm("edit");
        }}
      />

      <FilterFormPanel
        open={form === "create" || (form === "edit" && selectedFilter.data !== undefined)}
        filter={form === "edit" ? selectedFilter.data : undefined}
        onClose={() => {
          setForm(null);
        }}
        onSaved={(id) => {
          // After a creation, the new filter opens in the detail.
          if (form === "create" && id !== undefined) update({ sel: String(id) });
        }}
      />
    </section>
  );
}
