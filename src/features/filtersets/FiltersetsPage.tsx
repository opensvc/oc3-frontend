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
import { CreateFiltersetPanel } from "./CreateFiltersetPanel";
import { FiltersetDetailPanel } from "./FiltersetDetailPanel";

type FiltersetRow = components["schemas"]["FiltersetRow"];

const DEFAULT_SORT = ["fset_name"];

const FILTERSET_PROPS = [
  "fset_name",
  "fset_stats",
  "fset_author",
  "fset_updated",
  "id",
] as const satisfies readonly (keyof FiltersetRow)[];

const DEFAULT_COLS: string[] = ["fset_name", "fset_stats", "fset_author", "fset_updated"];

const FAMILY: Record<string, ColumnFamily> = {
  fset_name: "state",
  fset_stats: "state",
  fset_author: "team",
  fset_updated: "time",
  id: "state",
};

const ALL_PROPS = [...FILTERSET_PROPS];

function queryProps(cols: string[] | undefined): string {
  return [...new Set(["id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

function useFiltersetList(search: ResolvedListSearch) {
  return useQuery({
    // Under "filtersets": an edit also invalidates the dropdown of the views.
    queryKey: ["filtersets", "list", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // One row more than the page: apicollector does not return the total of a selection.
      const { data, error } = await api.GET("/filtersets", {
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
      const all: FiltersetRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function FiltersetsPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("filtersets");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/filtersets" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/filtersets" });
  const { data, isPending, isError, error, isFetching } = useFiltersetList(search);
  const [creating, setCreating] = useState(false);

  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/filtersets", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: FiltersetRow[] = Array.isArray(data.data) ? data.data : [];
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

  const columns: ListColumn<FiltersetRow>[] = FILTERSET_PROPS.map((prop) => ({
    prop,
    labelKey: `filtersets.fields.${prop}`,
    numeric: prop === "id",
    family: FAMILY[prop] ?? "state",
    render: (row: FiltersetRow, locale: string) => {
      if (prop === "fset_updated") return <DateTime value={row.fset_updated} locale={locale} />;
      if (prop === "fset_stats")
        return row.fset_stats === "T"
          ? t("detail.yes")
          : row.fset_stats === "F"
            ? t("detail.no")
            : row.fset_stats;
      return row[prop];
    },
  }));

  // A link to a nested filterset names it by name: the row is found that way too.
  const selected = data?.rows.find(
    (row) => String(row.id) === search.sel || row.fset_name === search.sel,
  );

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="filterset" className="h-5 w-5" />
          {t("filtersets.title")}
        </h1>
        <button
          type="button"
          onClick={() => {
            update({ sel: undefined });
            setCreating(true);
          }}
          className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink"
        >
          {t("filtersets.create.open")}
        </button>
      </div>
      <p className="mb-3 max-w-3xl text-ink-muted">{t("filtersets.intro")}</p>

      <CollectorList
        columns={columns}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        // Filtering the list of filtersets by a filterset would make no sense.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        selectAllMatching={allIds}
      />

      <FiltersetDetailPanel
        filtersetId={creating ? undefined : search.sel}
        label={selected?.fset_name ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />

      <CreateFiltersetPanel
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
        onCreated={(id) => {
          if (id !== undefined) update({ sel: String(id) });
        }}
      />
    </section>
  );
}
