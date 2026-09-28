import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { toTagRows } from "@/features/tags/tag-row";

type NodeHardwareRow = components["schemas"]["NodeHardwareRow"];
type AlertRow = components["schemas"]["AlertRow"];
type IpRow = components["schemas"]["IpRow"];
type DiskRow = components["schemas"]["DiskRow"];
type HbaRow = components["schemas"]["HbaRow"];

/**
 * Hardware inventory of the node, as pushed by the agent. Loaded whole: a node counts
 * a few dozen components.
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

/** Dashboard alerts aimed at the node, the most severe then the most recent first. */
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
 * IP addresses of the node, with the declared network that contains them. The
 * endpoint refuses `orderby` (same mapping as `/ips`): a node counts a few hundred at
 * most, so sorting is done on display.
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

/** Disks seen by the node, sorted by service then by id. */
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

/** Host bus adapters of the node (iSCSI, Fibre Channel…), by type then id. */
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

/** Tags attached to the node. `GET /…/tags` returns the generic `ListResponse`: read by `toTagRows`. */
export function useNodeTags(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["node", nodeId, "tags"],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/nodes/{node_id}/tags", {
        params: { path: { node_id: nodeId ?? "" }, query: { orderby: "tag_name", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return toTagRows(data.data);
    },
  });
}

type PackageRow = components["schemas"]["PackageRow"];

/** The filter naming the node's packages in `GET /packages`. */
function nodePackagesFilter(nodeId: string | undefined): string {
  return `node_id:eq:${nodeId ?? ""}`;
}

/**
 * Number of packages installed on the node, for the tab counter: read from the
 * total of a one-row page, a node counting a couple of thousand packages that the
 * counter need not load whenever the panel opens.
 */
export function useNodePackageCount(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["node", nodeId, "packages", "count"],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/packages", {
        params: { query: { props: "id", limit: 1, filter: [nodePackagesFilter(nodeId)] } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.meta?.total;
    },
  });
}

/** Packages installed on the node, by name then architecture; loaded when the tab opens. */
export function useNodePackages(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["node", nodeId, "packages"],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/packages", {
        params: {
          query: {
            props:
              "id,pkg_name,pkg_version,pkg_arch,pkg_type,sig_provider,pkg_install_date,pkg_updated",
            orderby: "pkg_name,pkg_arch",
            limit: 0,
            filter: [nodePackagesFilter(nodeId)],
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: PackageRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}
