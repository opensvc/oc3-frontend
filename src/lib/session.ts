import { setCredentials } from "@/lib/api/auth";
import { queryClient } from "@/lib/query";

/**
 * Ferme la session : oublie les identifiants et vide le cache des requêtes.
 *
 * Sans le second point, la personne qui se connecte ensuite dans le même onglet
 * verrait, le temps du `staleTime`, les données chargées pour la précédente : les
 * clés de requête ne portent pas l'utilisateur, et `["user", "self"]` désigne
 * « l'utilisateur connecté » quel qu'il soit.
 */
export function signOut(): void {
  queryClient.clear();
  setCredentials(null);
}
