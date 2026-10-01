import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type ModulesetRow = components["schemas"]["ModulesetRow"];
type ModuleRow = components["schemas"]["ModulesetModuleRow"];

/** A module of a moduleset. */
export interface ModulesetModule {
  id: number;
  name: string;
  autofix: boolean;
  author: string;
  updated: string;
}

/** A moduleset with its content and its teams, as its panel shows it. */
export interface ModulesetDetail {
  row: ModulesetRow;
  name: string;
  modules: ModulesetModule[];
  /** Names of the attached rulesets and of the included modulesets. */
  rulesets: string[];
  modulesets: string[];
  /** Roles of the groups the moduleset is published to and is under the responsibility of. */
  publications: string[];
  responsibles: string[];
}

/** The node and service usage of a moduleset. */
export interface ModulesetUsage {
  nodes: { id: string; name: string }[];
  services: { id: string; name: string }[];
}

const rows = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

/**
 * A moduleset, read in three requests: its record, its modules with their ids,
 * and its export for the relations and the teams, which carries them by name.
 */
export function useModuleset(modsetId: string | undefined) {
  return useQuery({
    queryKey: ["moduleset", modsetId],
    enabled: modsetId !== undefined,
    queryFn: async (): Promise<ModulesetDetail | null> => {
      const path = { modset_id: modsetId ?? "" };
      const [record, modules, exported] = await Promise.all([
        api.GET("/compliance/modulesets/{modset_id}", {
          params: { path, query: { props: "id,modset_name,modset_author,modset_updated" } },
        }),
        api.GET("/compliance/modulesets/{modset_id}/modules", {
          params: {
            path,
            query: {
              props: "id,modset_mod_name,autofix,modset_mod_author,modset_mod_updated",
              orderby: "modset_mod_name",
              limit: 0,
            },
          },
        }),
        api.GET("/compliance/modulesets/{modset_id}/export", { params: { path } }),
      ]);
      if (record.error !== undefined) throw new Error(problemText(record.error));
      if (modules.error !== undefined) throw new Error(problemText(modules.error));
      if (exported.error !== undefined) throw new Error(problemText(exported.error));
      const row = rows<ModulesetRow>(record.data.data)[0];
      if (row === undefined) return null;
      const own = (exported.data.modulesets ?? []).find((m) => m.id === row.id);
      return {
        row,
        name: row.modset_name ?? "",
        modules: rows<ModuleRow>(modules.data.data).flatMap((m) =>
          m.id === undefined
            ? []
            : [
                {
                  id: m.id,
                  name: m.modset_mod_name ?? "",
                  autofix: m.autofix === "T",
                  author: m.modset_mod_author ?? "",
                  updated: m.modset_mod_updated ?? "",
                },
              ],
        ),
        rulesets: [...(own?.rulesets ?? [])].sort(),
        modulesets: [...(own?.modulesets ?? [])].sort(),
        publications: [...(own?.publications ?? [])].sort(),
        responsibles: [...(own?.responsibles ?? [])].sort(),
      };
    },
  });
}

/**
 * Whether one of the user's groups is responsible for the moduleset, a Manager
 * being responsible for all: the condition, with the CompManager privilege the
 * server checks too, for editing it.
 */
export function useModulesetResponsible(modsetId: string | undefined) {
  return useQuery({
    queryKey: ["moduleset", modsetId, "responsible"],
    enabled: modsetId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/compliance/modulesets/{modset_id}/am_i_responsible", {
        params: { path: { modset_id: modsetId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data === true;
    },
  });
}

/** The nodes and services the moduleset is attached to. */
export function useModulesetUsage(modsetId: string | undefined) {
  return useQuery({
    queryKey: ["moduleset", modsetId, "usage"],
    enabled: modsetId !== undefined,
    queryFn: async (): Promise<ModulesetUsage> => {
      const path = { modset_id: modsetId ?? "" };
      const [nodes, services] = await Promise.all([
        api.GET("/compliance/modulesets/{modset_id}/nodes", {
          params: { path, query: { props: "node_id,nodename", orderby: "nodename", limit: 0 } },
        }),
        api.GET("/compliance/modulesets/{modset_id}/services", {
          params: { path, query: { props: "svc_id,svcname", orderby: "svcname", limit: 0 } },
        }),
      ]);
      if (nodes.error !== undefined) throw new Error(problemText(nodes.error));
      if (services.error !== undefined) throw new Error(problemText(services.error));
      return {
        nodes: rows<Record<string, unknown>>(nodes.data.data).map((n) => ({
          id: String(n.node_id ?? ""),
          name: String(n.nodename ?? ""),
        })),
        services: rows<Record<string, unknown>>(services.data.data).map((s) => ({
          id: String(s.svc_id ?? ""),
          name: String(s.svcname ?? ""),
        })),
      };
    },
  });
}

/** A ruleset or a moduleset, as the pickers of the panel offer it. */
export interface CompObject {
  id: number;
  name: string;
}

/** Every ruleset or every moduleset the user sees, for the pickers and the links of the panel. */
export function useCompObjects(kind: "ruleset" | "moduleset") {
  return useQuery({
    queryKey: ["compliance", kind, "names"],
    staleTime: 60_000,
    queryFn: async (): Promise<CompObject[]> => {
      if (kind === "ruleset") {
        const { data, error } = await api.GET("/compliance/rulesets", {
          params: { query: { props: "id,ruleset_name", orderby: "ruleset_name", limit: 0 } },
        });
        if (error !== undefined) throw new Error(problemText(error));
        return rows<{ id?: number; ruleset_name?: string }>(data.data).flatMap((r) =>
          r.id === undefined || r.ruleset_name === undefined
            ? []
            : [{ id: r.id, name: r.ruleset_name }],
        );
      }
      const { data, error } = await api.GET("/compliance/modulesets", {
        params: { query: { props: "id,modset_name", orderby: "modset_name", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return rows<{ id?: number; modset_name?: string }>(data.data).flatMap((m) =>
        m.id === undefined || m.modset_name === undefined
          ? []
          : [{ id: m.id, name: m.modset_name }],
      );
    },
  });
}

/**
 * Refreshes what a change to a moduleset touches: its panel, the Modulesets view
 * and the designer snapshot.
 */
export function useModulesetChanged() {
  const queryClient = useQueryClient();
  return async (modsetId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["moduleset", modsetId] }),
      queryClient.invalidateQueries({ queryKey: ["modulesets"] }),
      queryClient.invalidateQueries({ queryKey: ["compliance", "moduleset", "names"] }),
      queryClient.invalidateQueries({ queryKey: ["designer", "exports"] }),
    ]);
  };
}
