import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "@/components/ui/DateTime";
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
import { CreateNetworkPanel } from "./CreateNetworkPanel";
import { NetworkDetailPanel } from "./NetworkDetailPanel";

type IpRow = components["schemas"]["IpRow"];
type NetworkRow = components["schemas"]["NetworkRow"];

/**
 * Vide : apicollector refuse tout `orderby` sur cet endpoint. Le mapping `node_ip`
 * décrit ses props par une expression SQL sans référence de colonne, et
 * `buildOrderBy` exige cette référence — « prop "addr" cannot be used in orderby
 * (no column reference) ». Le serveur trie alors par adresse, son ordre par défaut.
 */
const DEFAULT_SORT: string[] = [];

/**
 * Toutes les propriétés exposées par apicollector pour une adresse, dans l'ordre de
 * son `meta.available_props`. Une ligne est une adresse relevée sur un node, jointe
 * à la définition du réseau auquel elle appartient : d'où les préfixes `net_`.
 * `satisfies` les confronte au schéma généré.
 */
const IP_PROPS = [
  "id",
  "node_id",
  "nodename",
  "intf",
  "mac",
  "type",
  "addr",
  "mask",
  "updated",
  "flag_deprecated",
  "net_id",
  "net_name",
  "net_network",
  "net_netmask",
  "net_broadcast",
  "net_gateway",
  "net_begin",
  "net_end",
  "net_pvid",
  "net_prio",
  "net_comment",
  "net_team_responsible",
] as const satisfies readonly (keyof IpRow)[];

/**
 * Colonnes par défaut : de quoi situer une adresse. Le nom du node plutôt que son
 * identifiant, contrairement au défaut du serveur.
 */
const DEFAULT_COLS: string[] = ["nodename", "intf", "addr", "mask", "type", "net_name"];

/** Props entiers du mapping `node_ip` d'oc3 (`Kind: "int64"`), alignés à droite. */
const NUMERIC_PROPS = new Set<string>(["id", "net_id", "net_prio", "flag_deprecated"]);

/** Props que le collector stocke en datetime. */
const DATE_PROPS = new Set<string>(["updated"]);

/** Famille de chaque colonne, dans le vocabulaire du collector historique. */
const FAMILY: Record<string, ColumnFamily> = {
  id: "network",
  node_id: "node",
  nodename: "node",
  intf: "network",
  mac: "network",
  type: "network",
  addr: "network",
  mask: "network",
  updated: "time",
  flag_deprecated: "network",
  net_id: "network",
  net_name: "network",
  net_network: "network",
  net_netmask: "network",
  net_broadcast: "network",
  net_gateway: "network",
  net_begin: "network",
  net_end: "network",
  net_pvid: "network",
  net_prio: "network",
  net_comment: "network",
  net_team_responsible: "team",
};

const COLUMNS: ListColumn<IpRow>[] = IP_PROPS.map((prop) => ({
  prop,
  labelKey: `networks.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "node",
  // Aucune colonne n'est triable tant que l'endpoint refuse `orderby`.
  sortable: false,
  render: (row: IpRow, locale: string) => {
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

function useIps(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["ips", search.offset, search.limit, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
      const { data, error } = await api.GET("/ips", {
        params: {
          query: {
            props: queryProps(search.cols),
            offset: search.offset,
            limit: search.limit + 1,
          },
        },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const all: IpRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function NetworksPage() {
  const { t } = useTranslation();
  const search = resolveListSearch(useSearch({ from: "/networks" }), DEFAULT_SORT);
  const navigate = useNavigate({ from: "/networks" });
  const { data, isPending, isError, error, isFetching } = useIps(search);

  /** Identifiants de toute la sélection, sans pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/ips", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: IpRow[] = Array.isArray(data.data) ? data.data : [];
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
  const [creating, setCreating] = useState(false);
  // Le réseau créé n'apparaît que par ses adresses : on confirme sa création ici.
  const [created, setCreated] = useState<NetworkRow | null>(null);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="network" className="h-5 w-5" />
          {t("networks.title")}
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
          {t("networks.create.open")}
        </button>
        {created !== null && (
          <span role="status" className="text-ink-muted">
            ●{" "}
            {t("networks.create.done", {
              name:
                created.name === "" || created.name === undefined
                  ? `${created.network ?? ""}/${String(created.netmask ?? "")}`
                  : created.name,
              range: `${created.begin ?? ""} – ${created.end ?? ""}`,
            })}
          </span>
        )}
      </div>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        // Les filtersets du collector ne portent pas sur les adresses.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        selectAllMatching={allIds}
      />

      <CreateNetworkPanel
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
        onCreated={setCreated}
      />

      <NetworkDetailPanel
        ipId={creating ? undefined : search.sel}
        label={selected?.addr ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
