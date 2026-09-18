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
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { CreateGroupPanel } from "./CreateGroupPanel";
import { GroupDetailPanel } from "./GroupDetailPanel";

type GroupRow = components["schemas"]["GroupRow"];

const DEFAULT_SORT = ["role"];

/**
 * Toutes les propriétés de groupe exposées par apicollector, dans l'ordre de son
 * `meta.available_props`. `satisfies` les confronte au schéma généré.
 */
const GROUP_PROPS = [
  "id",
  "role",
  "privilege",
  "description",
] as const satisfies readonly (keyof GroupRow)[];

/** Colonnes par défaut : le nom, la nature et ce que le groupe désigne. */
const DEFAULT_COLS: string[] = ["role", "privilege", "description"];

/** `id` vient du helper `col` sur une colonne entière : aligné à droite. */
const NUMERIC_PROPS = new Set<string>(["id"]);

/** Famille de chaque colonne : un groupe rassemble des personnes. */
const FAMILY: Record<string, ColumnFamily> = {
  id: "team",
  role: "team",
  privilege: "security",
  description: "team",
};

const ALL_PROPS = [...GROUP_PROPS];

/** Ne demander que les colonnes affichées : apicollector fait le pushdown en base. */
function queryProps(cols: string[] | undefined): string {
  return [...new Set(["id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

function useGroups(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["groups", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
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
  const search = resolveListSearch(useSearch({ from: "/groups" }), DEFAULT_SORT);
  const navigate = useNavigate({ from: "/groups" });
  const { data, isPending, isError, error, isFetching } = useGroups(search);
  const [creating, setCreating] = useState(false);

  /** Identifiants de toute la sélection, sans pagination. */
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
    void navigate({ search: (previous) => ({ ...previous, ...toSearchParams(next) }) });
  }

  // La lettre stockée en base ne dit rien à l'écran : on affiche sa nature.
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
            // Les deux tiroirs partagent le bord droit : ouvrir la création ferme le détail.
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
