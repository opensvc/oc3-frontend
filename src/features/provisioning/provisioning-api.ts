import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

export type ClusterDeclaration = components["schemas"]["ClusterDeclaration"];
export type ClusterDeclarationSummary = components["schemas"]["ClusterDeclarationSummary"];
export type ClusterDeclarationNode = components["schemas"]["ClusterDeclarationNode"];
export type ClusterHeartbeat = components["schemas"]["ClusterHeartbeat"];
export type ClusterEnrollment = components["schemas"]["ClusterEnrollment"];
export type NodeBootstrapToken = components["schemas"]["NodeBootstrapToken"];

/** The heartbeat drivers of om3, offered first in the type field. */
export const HEARTBEAT_TYPES = ["unicast", "multicast", "disk", "relay"] as const;

export const DECLARATIONS_KEY = ["cluster-declarations"] as const;

/** The query key of what the panel of a declared cluster shows. */
export function declarationKey(clusterId: string, part: "nodes" | "enrollments") {
  return ["cluster-declarations", clusterId, part] as const;
}

/** The declared clusters, by name, with their counts. */
export function useClusterDeclarations() {
  return useQuery({
    queryKey: DECLARATIONS_KEY,
    meta: { liveTables: ["cluster_declarations", "cluster_enrollments", "nodes"] },
    queryFn: async () => {
      const { data, error } = await api.GET("/cluster_declarations");
      if (error !== undefined) throw new Error(problemText(error));
      return data.data;
    },
  });
}

/** The nodes of a declared cluster, with their last bootstrap token. */
export function useDeclarationNodes(clusterId: string | undefined) {
  return useQuery({
    queryKey: declarationKey(clusterId ?? "", "nodes"),
    enabled: clusterId !== undefined,
    meta: { liveTables: ["nodes", "node_bootstrap_tokens", "cluster_declarations"] },
    queryFn: async () => {
      const { data, error } = await api.GET("/clusters/{cluster_id}/declaration/nodes", {
        params: { path: { cluster_id: clusterId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data;
    },
  });
}

/** The last enrollments of a declared cluster, newest first. */
export function useEnrollments(clusterId: string | undefined) {
  return useQuery({
    queryKey: declarationKey(clusterId ?? "", "enrollments"),
    enabled: clusterId !== undefined,
    meta: { liveTables: ["cluster_enrollments"] },
    // A pending enrollment expires without any change: read again now and then.
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await api.GET("/clusters/{cluster_id}/enrollments", {
        params: { path: { cluster_id: clusterId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data;
    },
  });
}

export async function declareCluster(body: {
  cluster_name: string;
  cluster_id?: string;
  app?: string;
  heartbeats: ClusterHeartbeat[];
}): Promise<ClusterDeclaration> {
  const { data, error } = await api.POST("/clusters", { body });
  if (error !== undefined) throw new Error(problemText(error));
  return data;
}

export async function updateDeclaration(
  clusterId: string,
  body: { app: string; heartbeats: ClusterHeartbeat[] },
): Promise<ClusterDeclaration> {
  const { data, error } = await api.PUT("/clusters/{cluster_id}/declaration", {
    params: { path: { cluster_id: clusterId } },
    body,
  });
  if (error !== undefined) throw new Error(problemText(error));
  return data;
}

export async function deleteDeclaration(clusterId: string): Promise<void> {
  const { error } = await api.DELETE("/clusters/{cluster_id}/declaration", {
    params: { path: { cluster_id: clusterId } },
  });
  if (error !== undefined) throw new Error(problemText(error));
}

export async function declareNode(
  clusterId: string,
  body: { nodename: string; app?: string },
): Promise<ClusterDeclarationNode> {
  const { data, error } = await api.POST("/clusters/{cluster_id}/declaration/nodes", {
    params: { path: { cluster_id: clusterId } },
    body,
  });
  if (error !== undefined) throw new Error(problemText(error));
  return data;
}

export async function issueBootstrapToken(
  nodeId: string,
  ttlMinutes: number,
): Promise<NodeBootstrapToken> {
  const { data, error } = await api.POST("/nodes/{node_id}/bootstrap_token", {
    params: { path: { node_id: nodeId } },
    body: { ttl_minutes: ttlMinutes },
  });
  if (error !== undefined) throw new Error(problemText(error));
  return data;
}

/**
 * The heartbeats as the editor writes them: one `keyword=value` per line, the
 * type apart.
 */
export function keywordsText(hb: ClusterHeartbeat): string {
  return Object.entries(hb)
    .filter(([key]) => key !== "type")
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("\n");
}

/**
 * The heartbeat of a type and its `keyword=value` lines, blank lines ignored;
 * the first line without `=` otherwise.
 */
export function heartbeatOf(
  type: string,
  text: string,
): { ok: true; hb: ClusterHeartbeat } | { ok: false; line: string } {
  const hb: ClusterHeartbeat = { type: type.trim() };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    const at = line.indexOf("=");
    if (at <= 0) return { ok: false, line };
    hb[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { ok: true, hb };
}

/** How far a node of a declared cluster went. */
export type NodeStage = "reporting" | "bootstrapped" | "token" | "expired" | "declared";

export function nodeStage(node: ClusterDeclarationNode, now: number): NodeStage {
  if (node.last_comm !== null && node.last_comm !== undefined) return "reporting";
  if (node.token_used !== null && node.token_used !== undefined) return "bootstrapped";
  if (node.token_expires !== null && node.token_expires !== undefined) {
    return Date.parse(node.token_expires) > now ? "token" : "expired";
  }
  return "declared";
}
