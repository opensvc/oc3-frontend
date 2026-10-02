import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { CLUSTER_GROUPS } from "./cluster-groups";

type ClusterRow = components["schemas"]["ClusterRow"];

const PROPS = CLUSTER_GROUPS.flatMap((group) => group.fields.map((f) => f.prop)).join(",");

/** Loads a cluster, for its detail panel. */
export function useCluster(clusterId: string | undefined) {
  return useQuery({
    queryKey: ["cluster", clusterId],
    enabled: clusterId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/clusters/{cluster_id}", {
        params: { path: { cluster_id: clusterId ?? "" }, query: { props: PROPS } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: ClusterRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });
}
