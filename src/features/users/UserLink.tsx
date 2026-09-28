import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { CrossLink } from "@/components/opensvc/CrossLink";

/**
 * Ids of the users, by full name.
 *
 * The collector records an author as "first_name last_name", not as an id nor a
 * login. The matching is done here, in a single shared and cached request; a name
 * two users share maps to no one, rather than to the wrong one.
 */
function useUserIds() {
  return useQuery({
    queryKey: ["users", "by-name"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await api.GET("/users", {
        params: { query: { props: "id,first_name,last_name", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = Array.isArray(data.data) ? data.data : [];
      const ids = new Map<string, string | undefined>();
      for (const row of rows) {
        if (row.id === undefined) continue;
        const name = fullName(`${row.first_name ?? ""} ${row.last_name ?? ""}`);
        ids.set(name, ids.has(name) ? undefined : String(row.id));
      }
      return ids;
    },
  });
}

/** The name as displayed: an empty first name leaves a leading space. */
function fullName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Author name in a list: a badge that opens the record of that user. */
export function UserLink({ name }: { name: unknown }) {
  const ids = useUserIds();
  if (typeof name !== "string") return <>{name}</>;
  const display = fullName(name);
  if (display === "") return null;
  return (
    <CrossLink kind="user" id={ids.data?.get(display)}>
      {display}
    </CrossLink>
  );
}
