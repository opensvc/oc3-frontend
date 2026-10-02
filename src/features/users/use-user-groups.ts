import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

type GroupRow = components["schemas"]["GroupRow"];

/** A group, as the membership lists of a user show it. */
export interface MemberGroup {
  id: number;
  role: string;
  privilege: boolean;
}

function toGroups(data: unknown): MemberGroup[] {
  const rows: GroupRow[] = Array.isArray(data) ? (data as GroupRow[]) : [];
  return rows.flatMap((row) =>
    row.id === undefined || row.role === undefined
      ? []
      : [{ id: row.id, role: row.role, privilege: row.privilege === "T" }],
  );
}

/** The groups a user is member of (`GET /users/{id}/groups`); "self" for the caller. */
export function useUserGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ["user", userId, "groups"],
    enabled: userId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/users/{user_id}/groups", {
        params: {
          path: { user_id: userId ?? "" },
          query: { props: "id,role,privilege", orderby: "role", limit: 0 },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return toGroups(data.data);
    },
  });
}

/**
 * Whether the caller may change the groups of a user: the GroupManager privilege,
 * a Manager having it too, as the server checks it.
 */
export function useCanManageMemberships(): boolean {
  const { data } = useUserGroups("self");
  return data?.some((g) => g.role === "Manager" || g.role === "GroupManager") ?? false;
}

/**
 * The groups the caller can attach a user to: every group for a Manager, their
 * own otherwise, which is what `GET /groups` lists and what the server accepts.
 */
export function useAttachableGroups(enabled: boolean) {
  return useQuery({
    queryKey: ["groups", "attachable"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api.GET("/groups", {
        params: { query: { props: "id,role,privilege", orderby: "role", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return toGroups(data.data);
    },
  });
}

/**
 * Refreshes what a membership change touches: the user's groups, the caller's own
 * privileges when they changed their own, the lists of users and groups.
 */
export function useMembershipChanged() {
  const queryClient = useQueryClient();
  return async (userId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user", userId, "groups"] }),
      queryClient.invalidateQueries({ queryKey: ["user", "self", "groups"] }),
      queryClient.invalidateQueries({ queryKey: ["users"] }),
      queryClient.invalidateQueries({ queryKey: ["groups"] }),
      queryClient.invalidateQueries({ queryKey: ["group"] }),
    ]);
  };
}
