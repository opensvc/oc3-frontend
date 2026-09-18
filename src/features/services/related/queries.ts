import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { toTagRows } from "@/features/tags/tag-row";

type DiskRow = components["schemas"]["DiskRow"];
type HbaRow = components["schemas"]["HbaRow"];
type InstanceRow = components["schemas"]["InstanceRow"];

/** Disques du service, vus par chacun de ses nodes. */
export function useServiceDisks(svcId: string | undefined) {
  return useQuery({
    queryKey: ["service", svcId, "disks"],
    enabled: svcId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/services/{svc_id}/disks", {
        params: {
          path: { svc_id: svcId ?? "" },
          query: {
            props:
              "disk_id,disk_name,disk_vendor,disk_model,disk_size,disk_used,disk_dg,node_id,nodename,svc_id,updated",
            orderby: "nodename,disk_id",
            limit: 0,
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: DiskRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}

/**
 * Adaptateurs de bus hôte des nodes qui portent une instance du service, comme dans
 * l'onglet Storage du collector historique (`ajax_svc_stor`). apicollector n'a pas
 * d'endpoint dédié : on lit les instances, puis les HBA de chaque node.
 */
export function useServiceHbas(svcId: string | undefined) {
  return useQuery({
    queryKey: ["service", svcId, "hbas"],
    enabled: svcId !== undefined,
    queryFn: async () => {
      const instances = await api.GET("/services_instances/{svc_id}", {
        params: {
          path: { svc_id: svcId ?? "" },
          query: { props: "node_id,nodes.nodename", limit: 0 },
        },
      });
      if (instances.error !== undefined) throw new Error(problemText(instances.error));
      const nodes: InstanceRow[] = Array.isArray(instances.data.data) ? instances.data.data : [];
      const unique = [...new Map(nodes.map((node) => [node.node_id ?? "", node])).values()].filter(
        (node) => node.node_id !== undefined && node.node_id !== "",
      );
      const perNode = await Promise.all(
        unique.map(async (node) => {
          const { data, error } = await api.GET("/nodes/{node_id}/hbas", {
            params: {
              path: { node_id: node.node_id ?? "" },
              query: {
                props: "id,node_id,hba_id,hba_type,updated",
                orderby: "hba_type,hba_id",
                limit: 0,
              },
            },
          });
          if (error !== undefined) throw new Error(problemText(error));
          const rows: HbaRow[] = Array.isArray(data.data) ? data.data : [];
          return { nodename: node["nodes.nodename"] ?? node.node_id ?? "", rows };
        }),
      );
      return perNode.sort((a, b) => a.nodename.localeCompare(b.nodename));
    },
  });
}

/** Tags attachés au service. `GET /…/tags` renvoie le `ListResponse` générique : lu par `toTagRows`. */
export function useServiceTags(svcId: string | undefined) {
  return useQuery({
    queryKey: ["service", svcId, "tags"],
    enabled: svcId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/services/{svc_id}/tags", {
        params: { path: { svc_id: svcId ?? "" }, query: { orderby: "tag_name", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return toTagRows(data.data);
    },
  });
}
