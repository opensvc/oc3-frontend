import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
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
import { CreateGroupPanel } from "./CreateGroupPanel";
import { GroupDetailPanel } from "./GroupDetailPanel";

type GroupRow = components["schemas"]["GroupRow"];

const DEFAULT_SORT = ["role"];

/**
 * Every group property exposed by apicollector, in the order of its
 * `meta.available_props`. `satisfies` confronts them with the generated schema.
 */
const GROUP_PROPS = [
  "id",
  "role",
  "privilege",
  "description",
] as const satisfies readonly (keyof GroupRow)[];

/** Default columns: the name, the nature and what the group names. */
const DEFAULT_COLS: string[] = ["role", "privilege", "description"];

/** `id` comes from the `col` helper on an integer column: aligned right. */
const NUMERIC_PROPS = new Set<string>(["id"]);

/** Famille de chaque colonne : un groupe rassemble des personnes. */
const FAMILY: Record<string, ColumnFamily> = {
  id: "team",
  role: "team",
  privilege: "security",
  description: "team",
};

const ALL_PROPS = [...GROUP_PROPS];

/** Ask only for the columns shown: apicollector pushes the selection down to the database. */
function queryProps(cols: string[] | undefined): string {
  return [...new Set(["id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

function useGroups(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["groups", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // One row more than the page: apicollector does not return the total of a selection.
      const { data, error } = await api.GET("/groups", {
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
      const all: GroupRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function GroupsPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("groups");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/groups" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/groups" });
  const { data, isPending, isError, error, isFetching } = useGroups(search);
  const [creating, setCreating] = useState(false);

  /** Ids of the whole selection, without pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/groups", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: GroupRow[] = Array.isArray(data.data) ? data.data : [];
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

  // The letter stored in the database says nothing on screen: its nature is shown.
  const columns: ListColumn<GroupRow>[] = GROUP_PROPS.map((prop) => ({
    prop,
    labelKey: `groups.fields.${prop}`,
    numeric: NUMERIC_PROPS.has(prop),
    family: FAMILY[prop] ?? "team",
    render: (row: GroupRow) =>
      prop === "privilege" && row.privilege !== undefined
        ? t(`groups.privilege.${row.privilege}`)
        : row[prop],
  }));

  const selected = data?.rows.find((row) => String(row.id) === search.sel);

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="group" className="h-5 w-5" />
          {t("groups.title")}
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
          {t("groups.create.open")}
        </button>
      </div>

      <CollectorList
        columns={columns}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        // Les filtersets du collector ne portent pas sur les groupes.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        selectAllMatching={allIds}
      />

      <GroupDetailPanel
        groupId={creating ? undefined : search.sel}
        label={selected?.role ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />

      <CreateGroupPanel
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
      />
    </section>
  );
}
