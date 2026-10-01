import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type MetricRow = components["schemas"]["MetricRow"];

/** Loads a metric; shared with the edit form, which starts from it. */
export function useMetric(metricId: string | undefined) {
  return useQuery({
    queryKey: ["metric", metricId],
    enabled: metricId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/metrics/{metric_id}", {
        params: { path: { metric_id: metricId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: MetricRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });
}
