import { useQuery } from "@tanstack/react-query";
import { DateTime } from "@/components/ui/DateTime";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import {
  resolveListSearch,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { TagDetailPanel } from "./TagDetailPanel";
import { toTagRows, type TagRow } from "./tag-row";

const DEFAULT_SORT = ["tag_name"];

/**
 * Props exposés par apicollector pour un tag. `id`, l'identifiant entier, est refusé
 * par l'API (« prop "id" is not allowed »), alors que c'est lui qu'attendent la
 * modification et la suppression : cette vue ne fait donc que lister. Voir notes.md.
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
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
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
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function TagsPage() {
  const { t } = useTranslation();
  const search = resolveListSearch(useSearch({ from: "/tags" }), DEFAULT_SORT);
  const navigate = useNavigate({ from: "/tags" });
  const { data, isPending, isError, error, isFetching } = useTags(search);

  /** Identifiants de toute la sélection, sans pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/tags", {
      params: { query: { props: "tag_id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    return toTagRows(data.data).map((row) => row.tag_id);
  }

  function update(next: Partial<ResolvedListSearch>) {
    void navigate({ search: (previous) => ({ ...previous, ...toSearchParams(next) }) });
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
        // Les filtersets du collector ne portent pas sur les tags.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
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
