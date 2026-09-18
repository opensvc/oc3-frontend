import { useState } from "react";
import { DateTime } from "@/components/ui/DateTime";
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
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { AppDetailPanel } from "./AppDetailPanel";
import { CreateAppPanel } from "./CreateAppPanel";

type AppRow = components["schemas"]["AppRow"];

const DEFAULT_SORT = ["app"];

/**
 * Toutes les propriétés de code application exposées par apicollector, dans l'ordre
 * de son `meta.available_props`. `satisfies` les confronte au schéma généré.
 */
const APP_PROPS = [
  "id",
  "app",
  "description",
  "app_domain",
  "app_team_ops",
  "updated",
] as const satisfies readonly (keyof AppRow)[];

/** Colonnes affichées par défaut : le code, ce qu'il désigne, et sa fraîcheur. */
const DEFAULT_COLS: string[] = ["app", "description", "updated"];

/** `id` vient du helper `col` sur une colonne entière : aligné à droite. */
const NUMERIC_PROPS = new Set<string>(["id"]);

/** Props que le collector stocke en datetime. */
const DATE_PROPS = new Set<string>(["updated"]);

/** Famille de chaque colonne, dans le vocabulaire du collector historique. */
const FAMILY: Record<string, ColumnFamily> = {
  id: "app",
  app: "app",
  description: "app",
  app_domain: "app",
  app_team_ops: "team",
  updated: "time",
};

const COLUMNS: ListColumn<AppRow>[] = APP_PROPS.map((prop) => ({
  prop,
  labelKey: `apps.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "node",
  render: (row: AppRow, locale: string) => {
    const value = row[prop];
    if (DATE_PROPS.has(prop) && typeof value === "string")
      return <DateTime value={value} locale={locale} />;
    return value;
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/** Ne demander que les colonnes affichées : apicollector fait le pushdown en base. */
function queryProps(cols: string[] | undefined): string {
  return [...new Set(["id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

function useApps(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["apps", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
      const { data, error } = await api.GET("/apps", {
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
      const all: AppRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function AppsPage() {
  const { t } = useTranslation();
  const search = resolveListSearch(useSearch({ from: "/apps" }), DEFAULT_SORT);
  const navigate = useNavigate({ from: "/apps" });
  const { data, isPending, isError, error, isFetching } = useApps(search);
  const [creating, setCreating] = useState(false);

  /** Identifiants de toute la sélection, sans pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/apps", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: AppRow[] = Array.isArray(data.data) ? data.data : [];
    return rows
      .map((row) => row.id)
      .filter((id): id is number => id !== undefined)
      .map(String);
  }

  function update(next: Partial<ResolvedListSearch>) {
    void navigate({
      search: (previous) => ({ ...previous, ...toSearchParams(next) }),
      resetScroll: resetsScroll(next),
    });
  }

  const selected = data?.rows.find((row) => String(row.id) === search.sel);

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="app" className="h-5 w-5" />
          {t("apps.title")}
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
          {t("apps.create.open")}
        </button>
      </div>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        // Les filtersets du collector ne portent pas sur les codes application.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        selectAllMatching={allIds}
      />

      <AppDetailPanel
        appId={creating ? undefined : search.sel}
        label={selected?.app ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />

      <CreateAppPanel
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
      />
    </section>
  );
}
