import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./api/client";
import { problemText } from "./api/problem";
import type { ResolvedListSearch } from "./list-search";

/**
 * Préférences de l'utilisateur, telles que l'ancien collector les range dans la
 * colonne `prefs` de `user_prefs` : un objet JSON libre, enregistré tel quel par
 * `POST /users/self/prefs`. Les colonnes visibles d'une vue y vivent sous
 * `tables.<vue>.visible_columns`, comme dans `init/static/js/osvc/tables/table.js`,
 * pour qu'un compte retrouve ses colonnes d'une interface à l'autre.
 *
 * Le reste de l'objet — filtres de colonne, mode direct, entrées de menu masquées —
 * appartient à l'ancienne interface : il est relu et réenregistré sans y toucher.
 */
export interface UserPrefs {
  tables?: Record<string, { visible_columns?: string[] } | undefined>;
  [key: string]: unknown;
}

const PREFS_KEY = ["user", "self", "prefs"];

/** Délai d'écriture, comme l'ancien collector : cocher trois colonnes n'écrit qu'une fois. */
const SAVE_DELAY = 1500;

function asPrefs(value: unknown): UserPrefs {
  return typeof value === "object" && value !== null ? (value as UserPrefs) : {};
}

async function fetchPrefs(): Promise<UserPrefs> {
  const { data, error } = await api.GET("/users/{user_id}/prefs", {
    params: { path: { user_id: "self" } },
  });
  if (error !== undefined) throw new Error(problemText(error));
  return asPrefs(data.data);
}

/** Préférences courantes, chargées une fois et partagées par toutes les vues. */
export function useUserPrefs() {
  return useQuery({ queryKey: PREFS_KEY, queryFn: fetchPrefs, staleTime: 5 * 60 * 1000 });
}

/**
 * Colonnes enregistrées pour une vue, et de quoi les mettre à jour.
 *
 * L'URL reste prioritaire : un lien partagé montre ses colonnes, pas celles de qui
 * l'ouvre. Les préférences ne servent donc que lorsque l'URL n'en porte pas, et
 * c'est le retour aux colonnes par défaut qui efface l'entrée enregistrée.
 */
export function useViewColumns(view: string) {
  const queryClient = useQueryClient();
  const prefs = useUserPrefs();

  const save = useMutation({
    mutationFn: async (cols: string[] | undefined) => {
      // Relire avant d'écrire : le serveur remplace l'objet entier, et une autre vue
      // a pu enregistrer ses colonnes entre-temps.
      const current = await ensurePrefs(queryClient);
      const tables = { ...current.tables };
      if (cols === undefined || cols.length === 0) {
        delete tables[view];
      } else {
        tables[view] = { ...tables[view], visible_columns: cols };
      }
      const next: UserPrefs = { ...current, tables };
      const { error } = await api.POST("/users/{user_id}/prefs", {
        params: { path: { user_id: "self" } },
        body: { data: next },
      });
      if (error !== undefined) throw new Error(problemText(error));
      queryClient.setQueryData(PREFS_KEY, next);
    },
  });

  return {
    cols: prefs.data?.tables?.[view]?.visible_columns,
    /** Enregistre après un court délai ; un nouvel appel annule le précédent. */
    save: (cols: string[] | undefined) => {
      clearTimeout(timers.get(view));
      timers.set(
        view,
        setTimeout(() => {
          save.mutate(cols);
        }, SAVE_DELAY),
      );
    },
  };
}

/** Un compte à rebours par vue : deux vues ouvertes n'annulent pas l'écriture l'une de l'autre. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function ensurePrefs(queryClient: QueryClient): Promise<UserPrefs> {
  return asPrefs(await queryClient.fetchQuery({ queryKey: PREFS_KEY, queryFn: fetchPrefs }));
}

/**
 * Applique les colonnes enregistrées à l'état d'URL d'une vue : l'URL l'emporte,
 * les préférences ne comblent que son absence.
 */
export function withSavedCols(
  search: ResolvedListSearch,
  saved: string[] | undefined,
): ResolvedListSearch {
  return search.cols === undefined && saved !== undefined ? { ...search, cols: saved } : search;
}
