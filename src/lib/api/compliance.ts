import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import { problemText } from "./problem";

const rows = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

/** A ruleset or a moduleset, as the pickers of the compliance panels offer it. */
export interface CompObject {
  id: number;
  name: string;
}

/** Every ruleset or every moduleset the user sees, for the pickers and the links of the compliance panels. */
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

/** The id of the object of that name, as a path parameter, or its name, which the API accepts too. */
export function compIdOf(list: CompObject[] | undefined, name: string): string {
  const id = list?.find((o) => o.name === name)?.id;
  return id === undefined ? name : String(id);
}

/** The id of the object of that name, to link its record, when known. */
export function compLinkOf(list: CompObject[] | undefined) {
  return (name: string): string | undefined => {
    const id = list?.find((o) => o.name === name)?.id;
    return id === undefined ? undefined : String(id);
  };
}
