import { useQuery } from "@tanstack/react-query";
import { DateTime } from "@/components/ui/DateTime";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import { formatSizeMiB } from "@/lib/format";
import {
  resolveListSearch,
  resetsScroll,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { DiskDetailPanel } from "./DiskDetailPanel";

type DiskRow = components["schemas"]["DiskRow"];

const DEFAULT_SORT = ["nodename", "disk_id"];

/**
 * Toutes les propriétés de disque exposées par apicollector, dans l'ordre de son
 * `meta.available_props`. `satisfies` les confronte au schéma généré.
 */
const DISK_PROPS = [
  "disk_id",
  "disk_name",
  "disk_devid",
  "disk_vendor",
  "disk_model",
  "disk_size",
  "disk_used",
  "disk_alloc",
  "disk_raid",
  "disk_group",
  "disk_level",
  "disk_arrayid",
  "disk_dg",
  "disk_region",
  "node_id",
  "nodename",
  "svc_id",
  "svcname",
  "app",
  "updated",
] as const satisfies readonly (keyof DiskRow)[];

/** Colonnes par défaut : quel disque, de quelle taille, rattaché à quoi. */
const DEFAULT_COLS: string[] = [
  "disk_id",
  "disk_model",
  "disk_size",
  "disk_used",
  "nodename",
  "svcname",
];

/** Props entiers du mapping `disk` d'oc3 (helper `colInt`), alignés à droite. */
const NUMERIC_PROPS = new Set<string>(["disk_size", "disk_used", "disk_alloc", "disk_level"]);

/** Tailles en mébioctets, comme la mémoire des nodes. */
const SIZE_PROPS = new Set<string>(["disk_size", "disk_used", "disk_alloc"]);

/** Props que le collector stocke en datetime. */
const DATE_PROPS = new Set<string>(["updated"]);

/** Famille de chaque colonne, dans le vocabulaire du collector historique. */
const FAMILY: Record<string, ColumnFamily> = {
  disk_id: "disk",
  disk_name: "disk",
  disk_devid: "disk",
  disk_vendor: "disk",
  disk_model: "disk",
  disk_size: "disk",
  disk_used: "disk",
  disk_alloc: "disk",
  disk_raid: "disk",
  disk_group: "disk",
  disk_level: "disk",
  disk_arrayid: "disk",
  disk_dg: "disk",
  disk_region: "disk",
  node_id: "node",
  nodename: "node",
  svc_id: "service",
  svcname: "service",
  app: "app",
  updated: "time",
};

const COLUMNS: ListColumn<DiskRow>[] = DISK_PROPS.map((prop) => ({
  prop,
  labelKey: `disks.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "node",
  render: (row: DiskRow, locale: string) => {
    const value = row[prop];
    if (SIZE_PROPS.has(prop) && typeof value === "number") return formatSizeMiB(value, locale);
    if (DATE_PROPS.has(prop) && typeof value === "string")
      return <DateTime value={value} locale={locale} />;
    return value;
  },
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/** Ne demander que les colonnes affichées : apicollector fait le pushdown en base. */
function queryProps(cols: string[] | undefined): string {
  return [...new Set(["disk_id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

function useDisks(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["disks", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
      const { data, error } = await api.GET("/disks", {
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
      const all: DiskRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function DisksPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("disks");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/disks" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/disks" });
  const { data, isPending, isError, error, isFetching } = useDisks(search);

  /** Identifiants de toute la sélection, sans pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/disks", {
      params: { query: { props: "disk_id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: DiskRow[] = Array.isArray(data.data) ? data.data : [];
    return rows.map((row) => row.disk_id).filter((id): id is string => id !== undefined);
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

  const selected = data?.rows.find((row) => row.disk_id === search.sel);

  return (
    <section>
      <h1 className="mb-3 flex items-center gap-2 text-title font-semibold">
        <ObjectIcon kind="disk" className="h-5 w-5" />
        {t("disks.title")}
      </h1>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => row.disk_id}
        search={search}
        onChange={update}
        // Les filtersets du collector ne portent pas sur les disques.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        selectAllMatching={allIds}
      />

      <DiskDetailPanel
        diskId={search.sel}
        label={selected?.disk_id ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
