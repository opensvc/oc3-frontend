import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

/**
 * Noms des filtersets du collector. C'est le seul filtrage qu'apicollector expose :
 * les listes n'acceptent aucun paramètre de filtre ad hoc, seulement ces ensembles
 * enregistrés côté serveur.
 */
export function useFiltersets() {
  return useQuery({
    queryKey: ["filtersets"],
    queryFn: async () => {
      const { data, error } = await api.GET("/filtersets", {
        params: { query: { props: "fset_name", orderby: "fset_name", limit: 500 } },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const rows: Record<string, unknown>[] = Array.isArray(data.data) ? data.data : [];
      return rows
        .map((row) => row.fset_name)
        .filter((name): name is string => typeof name === "string");
    },
  });
}
