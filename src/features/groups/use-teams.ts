import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type GroupRow = components["schemas"]["GroupRow"];

/**
 * Assignable teams: the organisation groups, neither the privilege groups nor the
 * private groups of a user (`user_<id>`), which the collector creates to carry the
 * rights of a person.
 */
export function useTeams() {
  return useQuery({
    queryKey: ["groups", "teams"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await api.GET("/groups", {
        params: { query: { props: "role,privilege", orderby: "role", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: GroupRow[] = Array.isArray(data.data) ? data.data : [];
      return rows
        .filter((row) => row.privilege === "F" && !(row.role ?? "").startsWith("user_"))
        .map((row) => row.role ?? "");
    },
  });
}
