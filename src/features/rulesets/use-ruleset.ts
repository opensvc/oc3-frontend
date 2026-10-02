import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import type { CompUsage } from "@/components/opensvc/CompEditorParts";

/** The properties of a ruleset its panel shows as a record. */
export interface RulesetRecord {
  id: number;
  ruleset_name: string;
  ruleset_type: string;
  ruleset_public: string;
  fset_name: string;
}

/** A variable of a ruleset. */
export interface RulesetVariable {
  id: number;
  name: string;
  varClass: string;
  value: string;
  author: string;
  updated: string;
}

/** A ruleset with its content and its teams, as its panel shows it. */
export interface RulesetDetail {
  row: RulesetRecord;
  variables: RulesetVariable[];
  /** Names of the rulesets it includes. */
  rulesets: string[];
  /** Roles of the groups it is published to and is under the responsibility of. */
  publications: string[];
  responsibles: string[];
}

/**
 * A ruleset, read from its export: its properties, its variables with their ids,
 * its filterset, the rulesets it includes and its teams, in one request. The
 * export also carries the descendants: only the ruleset itself is kept.
 */
export function useRuleset(rsetId: string | undefined) {
  return useQuery({
    queryKey: ["ruleset", rsetId],
    enabled: rsetId !== undefined,
    queryFn: async (): Promise<RulesetDetail | null> => {
      const { data, error } = await api.GET("/compliance/rulesets/{rset_id}/export", {
        params: { path: { rset_id: rsetId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const own = (data.rulesets ?? []).find(
        (r) => String(r.id) === rsetId || r.ruleset_name === rsetId,
      );
      if (own?.id === undefined) return null;
      return {
        row: {
          id: own.id,
          ruleset_name: own.ruleset_name ?? "",
          ruleset_type: own.ruleset_type ?? "",
          ruleset_public: own.ruleset_public ?? "",
          fset_name: own.fset_name ?? "",
        },
        variables: (own.variables ?? [])
          .flatMap((v) =>
            v.id === undefined
              ? []
              : [
                  {
                    id: v.id,
                    name: v.var_name ?? "",
                    varClass: v.var_class ?? "",
                    value: v.var_value ?? "",
                    // The collector stores the author's full name with a leading space.
                    author: (v.var_author ?? "").trim(),
                    updated: v.var_updated ?? "",
                  },
                ],
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
        rulesets: [...(own.rulesets ?? [])].sort(),
        publications: [...(own.publications ?? [])].sort(),
        responsibles: [...(own.responsibles ?? [])].sort(),
      };
    },
  });
}

/**
 * Whether one of the user's groups is responsible for the ruleset, a Manager
 * being responsible for all: the condition, with the CompManager privilege the
 * server checks too, for editing it.
 */
export function useRulesetResponsible(rsetId: string | undefined) {
  return useQuery({
    queryKey: ["ruleset", rsetId, "responsible"],
    enabled: rsetId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/compliance/rulesets/{rset_id}/am_i_responsible", {
        params: { path: { rset_id: rsetId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data === true;
    },
  });
}

/** The modulesets, rulesets, nodes and services using the ruleset. */
export function useRulesetUsage(rsetId: string | undefined) {
  return useQuery({
    queryKey: ["ruleset", rsetId, "usage"],
    enabled: rsetId !== undefined,
    queryFn: async (): Promise<CompUsage> => {
      const { data, error } = await api.GET("/compliance/rulesets/{rset_id}/usage", {
        params: { path: { rset_id: rsetId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const usage = data.data;
      return {
        modulesets: (usage?.modulesets ?? []).map((m) => ({
          id: String(m.id ?? ""),
          name: m.modset_name ?? "",
        })),
        rulesets: (usage?.rulesets ?? []).map((r) => ({
          id: String(r.id ?? ""),
          name: r.ruleset_name ?? "",
        })),
        nodes: (usage?.nodes ?? []).map((n) => ({ id: n.node_id ?? "", name: n.nodename ?? "" })),
        services: (usage?.services ?? []).map((s) => ({
          id: s.svc_id ?? "",
          name: s.svcname ?? "",
        })),
      };
    },
  });
}

/**
 * Refreshes what a change to a ruleset touches: its panel, the Rulesets view, the
 * moduleset panels that name it and the designer snapshot.
 */
export function useRulesetChanged() {
  const queryClient = useQueryClient();
  return async (rsetId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ruleset", rsetId] }),
      queryClient.invalidateQueries({ queryKey: ["rulesets"] }),
      queryClient.invalidateQueries({ queryKey: ["moduleset"] }),
      queryClient.invalidateQueries({ queryKey: ["compliance", "ruleset", "names"] }),
      queryClient.invalidateQueries({ queryKey: ["designer", "exports"] }),
    ]);
  };
}
