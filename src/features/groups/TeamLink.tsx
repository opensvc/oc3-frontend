import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { CrossLink } from "@/components/opensvc/CrossLink";

/**
 * Identifiants des groupes, par nom de rôle.
 *
 * Les listes ne portent que le nom d'une équipe, alors que la vue Groupes désigne
 * ses lignes par l'identifiant entier de `auth_group` et que `GET /groups/{id}`
 * refuse un nom — contrairement à `GET /apps/{app_id}`, qui accepte le code. La
 * correspondance est donc faite ici, en une requête partagée et mise en cache.
 */
function useGroupIds() {
  return useQuery({
    queryKey: ["groups", "by-role"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await api.GET("/groups", {
        params: { query: { props: "id,role", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = Array.isArray(data.data) ? data.data : [];
      return new Map(
        rows
          .filter((row) => row.role !== undefined && row.id !== undefined)
          .map((row) => [row.role ?? "", String(row.id)]),
      );
    },
  });
}

/** Nom d'équipe d'une liste : une puce qui ouvre la vue Groupes sur ce groupe. */
export function TeamLink({ name }: { name: unknown }) {
  const ids = useGroupIds();
  if (typeof name !== "string" || name === "") return <>{name}</>;
  return (
    <CrossLink kind="group" id={ids.data?.get(name)}>
      {name}
    </CrossLink>
  );
}
