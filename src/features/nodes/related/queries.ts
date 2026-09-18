import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type NodeHardwareRow = components["schemas"]["NodeHardwareRow"];
type AlertRow = components["schemas"]["AlertRow"];
type IpRow = components["schemas"]["IpRow"];
type DiskRow = components["schemas"]["DiskRow"];
type HbaRow = components["schemas"]["HbaRow"];

/**
 * Inventaire matériel du node, tel que remonté par l'agent. Chargé en entier : un
 * node compte quelques dizaines de composants.
 */
export function useNodeHardware(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["node", nodeId, "hardware"],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/nodes/{node_id}/hardware", {
        params: {
          path: { node_id: nodeId ?? "" },
          query: {
            props: "id,hw_type,hw_path,hw_class,hw_description,hw_driver,updated",
            orderby: "hw_type,hw_path",
            limit: 0,
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: NodeHardwareRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}

/** Alertes du dashboard qui visent le node, les plus graves puis les plus récentes d'abord. */
export function useNodeAlerts(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["node", nodeId, "alerts"],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/nodes/{node_id}/alerts", {
        params: {
          path: { node_id: nodeId ?? "" },
          query: {
            props: "id,dash_severity,dash_type,alert,dash_env,dash_created,dash_updated",
            orderby: "-dash_severity,-dash_updated",
            limit: 0,
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: AlertRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}

/**
 * Adresses IP du node, avec le réseau déclaré qui les contient. L'endpoint refuse
 * `orderby` (même mapping que `/ips`) : un node en compte au plus quelques centaines,
 * le tri est fait à l'affichage.
 */
export function useNodeIps(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["node", nodeId, "ips"],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/nodes/{node_id}/ips", {
        params: {
          path: { node_id: nodeId ?? "" },
          query: {
            props:
              "id,intf,type,addr,mask,mac,flag_deprecated,net_name,net_network,net_netmask,net_gateway,updated",
            limit: 0,
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: IpRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}

/** Disques vus par le node, triés par service puis par identifiant. */
export function useNodeDisks(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["node", nodeId, "disks"],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/nodes/{node_id}/disks", {
        params: {
          path: { node_id: nodeId ?? "" },
          query: {
            props:
              "disk_id,disk_name,disk_vendor,disk_model,disk_size,disk_used,disk_dg,disk_group,disk_raid,svc_id,svcname,app,updated",
            orderby: "svcname,disk_id",
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

/** Adaptateurs de bus hôte du node (iSCSI, Fibre Channel…), par type puis identifiant. */
export function useNodeHbas(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["node", nodeId, "hbas"],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/nodes/{node_id}/hbas", {
        params: {
          path: { node_id: nodeId ?? "" },
          query: { props: "id,hba_id,hba_type,updated", orderby: "hba_type,hba_id", limit: 0 },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: HbaRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}
