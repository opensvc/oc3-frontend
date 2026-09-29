import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { CrossLink } from "./CrossLink";

type NodeRow = components["schemas"]["NodeRow"];

/**
 * A list of node names, as a service's configuration stores them (`svc_nodes`:
 * "n1 n2 n3"), shown as badges that open each node's record. The record opens by
 * id: the names are resolved within the service's cluster, where a name is unique.
 * A node the user may not see, or not yet known to the collector, stays plain text.
 */
export function NodeNameLinks({
  names,
  clusterId,
}: {
  names: string;
  clusterId: string | undefined;
}) {
  const list = [...new Set(names.split(/[\s,]+/).filter((name) => name !== ""))];
  const { data: ids } = useQuery({
    queryKey: ["nodes", "ids-by-name", clusterId, list],
    enabled: list.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const filter = [`nodename:in:${list.join(",")}`];
      if (clusterId !== undefined && clusterId !== "") filter.push(`cluster_id:eq:${clusterId}`);
      const { data, error } = await api.GET("/nodes", {
        params: { query: { props: "node_id,nodename", limit: 0, filter } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: NodeRow[] = Array.isArray(data.data) ? data.data : [];
      return new Map(
        rows.flatMap((row) =>
          row.nodename !== undefined && row.node_id !== undefined
            ? [[row.nodename, row.node_id] as const]
            : [],
        ),
      );
    },
  });

  return (
    <span className="flex flex-wrap gap-1">
      {list.map((name) => (
        <CrossLink key={name} kind="node" id={ids?.get(name)}>
          {name}
        </CrossLink>
      ))}
    </span>
  );
}
