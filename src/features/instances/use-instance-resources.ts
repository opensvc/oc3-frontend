import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import type { ServiceResource } from "@/features/services/related/queries";
import { fromInstanceId } from "./instance-id";

type ResourceRow = components["schemas"]["ResourceRow"];

/**
 * Resources of an instance: those its node reports for the service, and of an
 * encapsulated service, those of its container only.
 */
export function useInstanceResources(instanceId: string | undefined) {
  const key = instanceId === undefined ? null : fromInstanceId(instanceId);
  return useQuery({
    queryKey: ["instance", instanceId, "resources"],
    enabled: key !== null,
    queryFn: async (): Promise<ServiceResource[]> => {
      const { data, error } = await api.GET("/services/{svc_id}/nodes/{node_id}/resources", {
        params: {
          path: { svc_id: key?.svcId ?? "", node_id: key?.nodeId ?? "" },
          query: {
            props:
              "id,node_id,vmname,rid,res_type,res_status,res_desc,res_log,res_monitor,res_disable,res_optional,updated",
            orderby: "rid",
            limit: 0,
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = (Array.isArray(data.data) ? data.data : []) as ResourceRow[];
      const vmname = key?.vmname ?? "";
      return rows
        .filter((row) => (row.vmname ?? "") === vmname)
        .map((row) => ({ ...row, nodename: "" }));
    },
  });
}
