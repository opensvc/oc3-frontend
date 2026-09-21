import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type FiltersetRow = components["schemas"]["FiltersetRow"];
type FiltersetExportEntry = components["schemas"]["FiltersetExportEntry"];

/**
 * Logical operators joining an entry to the previous one, as in the historical
 * collector (`gen_filtersets_filters.f_log_op`) and the enum of the OpenAPI schema.
 */
export const LOG_OPS = ["AND", "AND NOT", "OR", "OR NOT"] as const;
export type LogOp = (typeof LOG_OPS)[number];

export function isLogOp(value: string | undefined): value is LogOp {
  return LOG_OPS.some((op) => op === value);
}

/** Every query of a filterset shares this root, to be invalidated together. */
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
 * Entries of a filterset, in order. The export is the only read that gives both the
 * filters and the nested filtersets with their position and their operator:
 * `GET /filtersets/{id}/filtersets` returns only the filtersets themselves.
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
      // The export also contains, flattened, the nested filtersets: only the root is
      // kept, named by its id or by its name, as in the API.
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

/** Number of nodes and services selected, to place the effect of the filterset. */
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
