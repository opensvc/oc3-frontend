import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

/**
 * Names of the collector filtersets. This is the only filtering apicollector exposes:
 * the lists accept no ad hoc filter parameter, only these sets saved server side.
 */
export function useFiltersets() {
  return useQuery({
    queryKey: ["filtersets"],
    queryFn: async () => {
      const { data, error } = await api.GET("/filtersets", {
        params: { query: { props: "fset_name", orderby: "fset_name", limit: 500 } },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const rows: Record<string, unknown>[] = Array.isArray(data.data) ? data.data : [];
      return rows
        .map((row) => row.fset_name)
        .filter((name): name is string => typeof name === "string");
    },
  });
}
