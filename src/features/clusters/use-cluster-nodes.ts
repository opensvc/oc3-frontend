import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type NodeRow = components["schemas"]["NodeRow"];

/**
 * The ids of the nodes of a cluster the user may see, by name: what turns the node
 * names of the cluster's configuration into links. A name the collector does not
 * know, or whose node the user may not see, is absent.
 */
export function useClusterNodes(clusterId: string | undefined) {
  return useQuery({
    queryKey: ["cluster", clusterId, "nodes"],
    enabled: clusterId !== undefined && clusterId !== "",
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await api.GET("/nodes", {
        params: {
          query: {
            props: "node_id,nodename",
            filter: [`cluster_id:${clusterId ?? ""}`],
            limit: 0,
            meta: "0",
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: NodeRow[] = Array.isArray(data.data) ? data.data : [];
      return new Map(
        rows.flatMap((row) =>
          row.nodename === undefined || row.node_id === undefined
            ? []
            : [[row.nodename, row.node_id] as const],
        ),
      );
    },
  });
}
