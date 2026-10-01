import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type ReportRow = components["schemas"]["ReportRow"];

/** Loads a report, for its detail panel. */
export function useReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ["report", reportId],
    enabled: reportId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/reports/{report_id}", {
        params: { path: { report_id: reportId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: ReportRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });
}
