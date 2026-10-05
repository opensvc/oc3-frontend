import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import { problemText } from "./problem";
import { useImpersonation } from "./impersonation";

/**
 * The privilege groups of the user the requests are made as: the impersonated
 * user while impersonating, the signed-in one otherwise. The API answers for that
 * user (`/users/self` follows the impersonation header), and the cache key follows
 * the impersonation, so that a switch reads them again.
 */
export function useEffectivePrivileges() {
  const actingAs = useImpersonation()?.userId ?? null;
  return useQuery({
    queryKey: ["user", "self", "privileges", actingAs],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await api.GET("/users/{user_id}/groups", {
        params: { path: { user_id: "self" }, query: { props: "role,privilege", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = Array.isArray(data.data)
        ? (data.data as { role?: string; privilege?: unknown }[])
        : [];
      return new Set(
        rows
          .filter((row) => row.privilege === "T" || row.privilege === true)
          .flatMap((row) => (row.role === undefined ? [] : [row.role])),
      );
    },
  });
}

/** Whether privileges allow an entry needing one of `required`: a Manager has them all. */
export function hasPrivilege(
  privileges: ReadonlySet<string>,
  required: readonly string[] | undefined,
): boolean {
  if (required === undefined || required.length === 0) return true;
  return privileges.has("Manager") || required.some((p) => privileges.has(p));
}
