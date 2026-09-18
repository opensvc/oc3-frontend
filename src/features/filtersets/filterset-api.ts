import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type FiltersetRow = components["schemas"]["FiltersetRow"];
type FiltersetExportEntry = components["schemas"]["FiltersetExportEntry"];

/**
 * Opérateurs logiques qui joignent une entrée à la précédente, comme dans le collector
 * historique (`gen_filtersets_filters.f_log_op`) et l'enum du schéma OpenAPI.
 */
export const LOG_OPS = ["AND", "AND NOT", "OR", "OR NOT"] as const;
export type LogOp = (typeof LOG_OPS)[number];

export function isLogOp(value: string | undefined): value is LogOp {
  return LOG_OPS.some((op) => op === value);
}

/** Toutes les requêtes d'un filterset partagent cette racine, pour être invalidées ensemble. */
export const FILTERSET_KEY = "filterset";

export function useFilterset(id: string | undefined) {
  return useQuery({
    queryKey: [FILTERSET_KEY, id, "row"],
    enabled: id !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/filtersets/{filterset_id}", {
        params: { path: { filterset_id: id ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: FiltersetRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });
}

/**
 * Entrées d'un filterset, dans l'ordre. L'export est la seule lecture qui donne à la
 * fois les filtres et les filtersets encapsulés avec leur position et leur opérateur :
 * `GET /filtersets/{id}/filtersets` ne renvoie que les filtersets eux-mêmes.
 */
export function useFiltersetEntries(id: string | undefined) {
  return useQuery({
    queryKey: [FILTERSET_KEY, id, "entries"],
    enabled: id !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/filtersets/{filterset_id}/export", {
        params: { path: { filterset_id: id ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      // L'export contient aussi, à plat, les filtersets encapsulés : on ne garde que la
      // racine, désignée par son identifiant ou par son nom, comme dans l'API.
      const root = data.filtersets.find((item) => String(item.id) === id || item.fset_name === id);
      const entries: FiltersetExportEntry[] = [...(root?.filters ?? [])];
      return entries.sort((a, b) => a.f_order - b.f_order);
    },
  });
}

export function useFiltersetUsage(id: string | undefined) {
  return useQuery({
    queryKey: [FILTERSET_KEY, id, "usage"],
    enabled: id !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/filtersets/{filterset_id}/usage", {
        params: { path: { filterset_id: id ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data;
    },
  });
}

/** Nombre de nodes et de services sélectionnés, pour situer l'effet du filterset. */
export function useFiltersetMatches(id: string | undefined) {
  return useQuery({
    queryKey: [FILTERSET_KEY, id, "matches"],
    enabled: id !== undefined,
    queryFn: async () => {
      const path = { filterset_id: id ?? "" };
      const [nodes, services] = await Promise.all([
        api.GET("/filtersets/{filterset_id}/nodes", {
          params: { path, query: { props: "node_id", limit: 0 } },
        }),
        api.GET("/filtersets/{filterset_id}/services", {
          params: { path, query: { props: "svc_id", limit: 0 } },
        }),
      ]);
      if (nodes.error !== undefined) throw new Error(problemText(nodes.error));
      if (services.error !== undefined) throw new Error(problemText(services.error));
      return {
        nodes: Array.isArray(nodes.data.data) ? nodes.data.data.length : 0,
        services: Array.isArray(services.data.data) ? services.data.data.length : 0,
      };
    },
  });
}
