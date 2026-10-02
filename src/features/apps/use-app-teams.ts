import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import type { CompGroup } from "@/components/opensvc/CompEditorParts";
import { useUserGroups } from "@/features/users/use-user-groups";

function toGroups(data: unknown): CompGroup[] {
  const rows = Array.isArray(data) ? (data as { id?: unknown; role?: unknown }[]) : [];
  return rows.flatMap((row) =>
    typeof row.id === "number" && typeof row.role === "string"
      ? [{ id: row.id, role: row.role }]
      : [],
  );
}

/** The responsible and publication groups of an app. */
export function useAppTeams(appId: string | undefined) {
  return useQuery({
    queryKey: ["app", appId, "teams"],
    enabled: appId !== undefined,
    queryFn: async () => {
      const query = { props: "id,role", orderby: "role", limit: 0 };
      const path = { app_id: appId ?? "" };
      const [responsibles, publications] = await Promise.all([
        api.GET("/apps/{app_id}/responsibles", { params: { path, query } }),
        api.GET("/apps/{app_id}/publications", { params: { path, query } }),
      ]);
      if (responsibles.error !== undefined) throw new Error(problemText(responsibles.error));
      if (publications.error !== undefined) throw new Error(problemText(publications.error));
      return {
        responsibles: toGroups(responsibles.data.data),
        publications: toGroups(publications.data.data),
      };
    },
  });
}

/**
 * Whether the caller may change the teams of an app: the AppManager privilege, a
 * Manager having it too, and the responsibility of the app, as the server checks.
 */
export function useCanEditAppTeams(appId: string | undefined): boolean {
  const self = useUserGroups("self");
  const privileged =
    self.data?.some((g) => g.role === "Manager" || g.role === "AppManager") ?? false;
  const responsible = useQuery({
    queryKey: ["app", appId, "responsible"],
    enabled: appId !== undefined && privileged,
    queryFn: async () => {
      const { data, error } = await api.GET("/apps/{app_id}/am_i_responsible", {
        params: { path: { app_id: appId ?? "" } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data === true;
    },
  });
  return privileged && responsible.data === true;
}

/**
 * The organizational groups the caller can give an app to: every one for a
 * Manager, their own otherwise, as the server accepts; privilege groups are
 * refused.
 */
export function useAppTeamCandidates(enabled: boolean) {
  return useQuery({
    queryKey: ["groups", "app-teams"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api.GET("/groups", {
        params: { query: { props: "id,role,privilege", orderby: "role", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = Array.isArray(data.data) ? data.data : [];
      return toGroups(rows.filter((g) => g.privilege !== "T"));
    },
  });
}

/** Refreshes what a change of the teams of an app touches. */
export function useAppTeamsChanged() {
  const queryClient = useQueryClient();
  return async (appId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["app", appId] }),
      queryClient.invalidateQueries({ queryKey: ["apps"] }),
      queryClient.invalidateQueries({ queryKey: ["groups"] }),
      queryClient.invalidateQueries({ queryKey: ["group"] }),
    ]);
  };
}
