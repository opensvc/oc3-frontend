import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type FilterRow = components["schemas"]["FilterRow"];

/** Charge un filtre ; partagé avec le formulaire de modification, qui part de lui. */
export function useFilter(filterId: string | undefined) {
  return useQuery({
    queryKey: ["filter", filterId],
    enabled: filterId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/filters/{filter_id}", {
        params: { path: { filter_id: filterId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: FilterRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });
}
