import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type ChartRow = components["schemas"]["ChartRow"];

/** Loads a chart, for its detail panel. */
export function useChart(chartId: string | undefined) {
  return useQuery({
    queryKey: ["chart", chartId],
    enabled: chartId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/charts/{chart_id}", {
        params: { path: { chart_id: chartId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: ChartRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });
}
