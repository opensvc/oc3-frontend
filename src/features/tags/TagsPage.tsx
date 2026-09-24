import { useQuery } from "@tanstack/react-query";
import { DateTime } from "@/components/ui/DateTime";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { toPage } from "@/lib/api/page";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import {
  resolveListSearch,
  resetsScroll,
  mergeSearch,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { TagDetailPanel } from "./TagDetailPanel";
import { toTagRows, type TagRow } from "./tag-row";

const DEFAULT_SORT = ["tag_name"];

/**
 * Props exposed by apicollector for a tag. `id`, the integer id, is refused by the
 * API ("prop "id" is not allowed"), although it is what editing and deletion expect:
 * this view therefore only lists. See notes.md.
 */
const TAG_PROPS = ["tag_name", "tag_exclude", "tag_data", "tag_created", "tag_id"] as const;

const DEFAULT_COLS: string[] = ["tag_name", "tag_exclude", "tag_created"];

const FAMILY: Record<string, "team" | "time"> = {
  tag_name: "team",
  tag_exclude: "team",
  tag_data: "team",
  tag_id: "team",
  tag_created: "time",
};

const COLUMNS: ListColumn<TagRow>[] = TAG_PROPS.map((prop) => ({
  prop,
  labelKey: `tags.fields.${prop}`,
  family: FAMILY[prop] ?? "team",
  render: (row: TagRow, locale: string) =>
    prop === "tag_created" ? <DateTime value={row.tag_created} locale={locale} /> : row[prop],
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

function queryProps(cols: string[] | undefined): string {
  return [...new Set(["tag_id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

function useTags(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["tags", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // One row more than the page: apicollector does not return the total of a selection.
      const { data, error } = await api.GET("/tags", {
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
      const all = toTagRows(data.data);
      return toPage(all, data.meta, search.limit);
    },
  });
}

export function TagsPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("tags");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/tags" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/tags" });
  const { data, isPending, isError, error, isFetching } = useTags(search);

  /** Ids of the whole selection, without pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/tags", {
      params: { query: { props: "tag_id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    return toTagRows(data.data).map((row) => row.tag_id);
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

  const selected = data?.rows.find((row) => row.tag_id === search.sel);

  return (
    <section>
      <h1 className="mb-3 flex items-center gap-2 text-title font-semibold">
        <ObjectIcon kind="app" className="h-5 w-5" />
        {t("tags.title")}
      </h1>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => row.tag_id}
        search={search}
        onChange={update}
        // The collector's filtersets do not apply to tags.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        total={data?.total}
        selectAllMatching={allIds}
      />

      <TagDetailPanel
        tag={selected}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
