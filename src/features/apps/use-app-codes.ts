import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

/**
 * The application codes the user can give a node or a service: those `GET /apps`
 * lists, the apps one of their groups is responsible for, every app for a
 * Manager. The server gives any other code back as the user's default app.
 */
export function useAppCodes() {
  return useQuery({
    queryKey: ["apps", "codes"],
    queryFn: async () => {
      const { data, error } = await api.GET("/apps", {
        params: { query: { props: "app", orderby: "app", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = Array.isArray(data.data) ? data.data : [];
      return rows.map((row) => row.app).filter((app): app is string => typeof app === "string");
    },
  });
}
