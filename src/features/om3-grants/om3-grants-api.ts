import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

export type Om3GrantRule = components["schemas"]["OidcProviderGrant"];
export type Om3GrantRuleInput = components["schemas"]["OidcProviderGrantInput"];
export type Om3SignInRequest = components["schemas"]["OidcProviderRequest"];

/** Whether the collector is the OpenID Connect provider of the om3 clusters, and its issuer. */
export function useOidcProviderInfo() {
  return useQuery({
    queryKey: ["oidc-provider"],
    queryFn: async () => {
      const { data, error } = await api.GET("/oidc_provider");
      if (error !== undefined) throw new Error(problemText(error));
      return data;
    },
  });
}

/** The rules giving om3 grants to the teams, the ones of every cluster first. */
export function useOm3GrantRules() {
  return useQuery({
    queryKey: ["om3-grants"],
    queryFn: async () => {
      const { data, error } = await api.GET("/oidc_provider/grants");
      if (error !== undefined) throw new Error(problemText(error));
      return data.data;
    },
  });
}

/** The teams a rule may name: all of them, the private ones of the users included. */
export function useGrantTeams() {
  return useQuery({
    queryKey: ["groups", "all-roles"],
    queryFn: async () => {
      const { data, error } = await api.GET("/groups", {
        params: { query: { props: "id,role", orderby: "role", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = Array.isArray(data.data) ? data.data : [];
      return rows.flatMap((row) =>
        typeof row.id === "number" && typeof row.role === "string"
          ? [{ id: row.id, role: row.role }]
          : [],
      );
    },
  });
}

/** The clusters a rule may name, by name. */
export function useGrantClusters() {
  return useQuery({
    queryKey: ["clusters", "id-name"],
    queryFn: async () => {
      const { data, error } = await api.GET("/clusters", {
        params: { query: { props: "cluster_id,cluster_name", orderby: "cluster_name", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = Array.isArray(data.data) ? data.data : [];
      return rows.flatMap((row) =>
        typeof row.cluster_id === "string" && typeof row.cluster_name === "string"
          ? [{ id: row.cluster_id, name: row.cluster_name }]
          : [],
      );
    },
  });
}

/** Creates a rule, or changes one: its saved state. */
export async function saveOm3GrantRule(
  id: number | undefined,
  body: Om3GrantRuleInput,
): Promise<Om3GrantRule> {
  const { data, error } =
    id === undefined
      ? await api.POST("/oidc_provider/grants", { body })
      : await api.POST("/oidc_provider/grants/{grant_id}", {
          params: { path: { grant_id: id } },
          body,
        });
  if (error !== undefined) throw new Error(problemText(error));
  return data;
}

export async function deleteOm3GrantRule(id: number): Promise<void> {
  const { error } = await api.DELETE("/oidc_provider/grants/{grant_id}", {
    params: { path: { grant_id: id } },
  });
  if (error !== undefined) throw new Error(problemText(error));
}

/** A sign-in request of an om3 cluster, waiting for the user signed in to approve it. */
export function useSignInRequest(requestId: string) {
  return useQuery({
    queryKey: ["oidc-provider", "request", requestId],
    queryFn: async () => {
      const { data, error } = await api.GET("/oidc_provider/requests/{request_id}", {
        params: { path: { request_id: requestId } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data;
    },
    // A request is approved once: no refetch would find it again afterwards.
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

/** Approves or denies the request: where to send the browser, back to the cluster. */
export async function answerSignInRequest(requestId: string, approve: boolean): Promise<string> {
  const params = { params: { path: { request_id: requestId } } };
  const { data, error } = approve
    ? await api.POST("/oidc_provider/requests/{request_id}/approve", params)
    : await api.POST("/oidc_provider/requests/{request_id}/deny", params);
  if (error !== undefined) throw new Error(problemText(error));
  return data.redirect_to;
}
