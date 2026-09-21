import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./api/client";
import { problemText } from "./api/problem";
import type { ListSearch } from "./list-search";
import { applyTheme, cachedTheme, isTheme, watchSystemTheme, type Theme } from "./theme";

/**
 * Préférences de l'utilisateur, telles que l'ancien collector les range dans la
 * colonne `prefs` de `user_prefs` : un objet JSON libre, enregistré tel quel par
 * `POST /users/self/prefs`. Les colonnes visibles d'une vue y vivent sous
 * `tables.<vue>.visible_columns`, comme dans `init/static/js/osvc/tables/table.js`,
 * pour qu'un compte retrouve ses colonnes d'une interface à l'autre. Le tri est
 * rangé à côté, sous `tables.<vue>.sort` : l'ancienne interface ne le gardait pas,
 * cette clé lui est donc inconnue et sans effet pour elle.
 *
 * Le reste de l'objet — filtres de colonne, mode direct, entrées de menu masquées —
 * appartient à l'ancienne interface : il est relu et réenregistré sans y toucher.
 */
/** Préférences d'une vue : ce qui suit le compte plutôt que l'URL. */
export interface ViewPrefs {
  visible_columns?: string[];
  /** Clés de tri, préfixées de `-` pour l'ordre descendant, comme dans l'URL. */
  sort?: string[];
}

export interface UserPrefs {
  tables?: Record<string, ViewPrefs | undefined>;
  /** Thème choisi ; absent vaut « système ». */
  theme?: string;
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
 * Colonnes et tri enregistrés pour une vue, et de quoi les mettre à jour.
 *
 * L'URL reste prioritaire : un lien partagé montre ses colonnes et son tri, pas ceux
 * de qui l'ouvre. Les préférences ne servent donc que lorsque l'URL n'en porte pas,
 * et revenir aux colonnes par défaut efface l'entrée enregistrée.
 */
export function useViewPrefs(view: string) {
  const queryClient = useQueryClient();
  const prefs = useUserPrefs();

  const save = useMutation({
    mutationFn: async ({ key, value }: { key: keyof ViewPrefs; value: string[] | undefined }) =>
      savePrefs(queryClient, (current) => {
        const tables = { ...current.tables };
        const entry: ViewPrefs = { ...tables[view] };
        if (value === undefined || value.length === 0) {
          delete entry[key];
        } else {
          entry[key] = value;
        }
        if (Object.keys(entry).length === 0) {
          delete tables[view];
        } else {
          tables[view] = entry;
        }
        return { ...current, tables };
      }),
  });

  /** Enregistre après un court délai ; un nouvel appel annule le précédent. */
  function later(key: keyof ViewPrefs, value: string[] | undefined) {
    const timer = `${view}:${key}`;
    clearTimeout(timers.get(timer));
    timers.set(
      timer,
      setTimeout(() => {
        save.mutate({ key, value });
      }, SAVE_DELAY),
    );
  }

  const entry = prefs.data?.tables?.[view];
  return {
    cols: entry?.visible_columns,
    sort: entry?.sort,
    saveCols: (cols: string[] | undefined) => {
      later("visible_columns", cols);
    },
    saveSort: (sort: string[] | undefined) => {
      later("sort", sort);
    },
  };
}

/** Un compte à rebours par vue et par clé : deux écritures ne s'annulent pas l'une l'autre. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function ensurePrefs(queryClient: QueryClient): Promise<UserPrefs> {
  return asPrefs(await queryClient.fetchQuery({ queryKey: PREFS_KEY, queryFn: fetchPrefs }));
}

/**
 * Applique une modification à l'objet de préférences et l'enregistre.
 *
 * L'objet est relu avant d'être réécrit : le serveur remplace le tout, et une autre
 * vue a pu enregistrer ses colonnes entre-temps.
 */
export async function savePrefs(
  queryClient: QueryClient,
  change: (current: UserPrefs) => UserPrefs,
): Promise<void> {
  const next = change(await ensurePrefs(queryClient));
  const { error } = await api.POST("/users/{user_id}/prefs", {
    params: { path: { user_id: "self" } },
    body: { data: next },
  });
  if (error !== undefined) throw new Error(problemText(error));
  queryClient.setQueryData(PREFS_KEY, next);
}

/**
 * Complète l'état d'URL d'une vue avec ses préférences, avant sa résolution :
 * l'URL l'emporte, les préférences ne comblent que son absence.
 */
export function withSavedSearch(
  search: ListSearch,
  saved: { cols?: string[]; sort?: string[] },
): ListSearch {
  return {
    ...search,
    cols: search.cols ?? saved.cols?.join(","),
    sort: search.sort ?? saved.sort?.join(","),
  };
}

/**
 * Thème choisi, appliqué et enregistré.
 *
 * Le thème mis en cache localement s'applique dès le démarrage (`src/main.tsx`) ;
 * dès que les préférences du compte arrivent, c'est leur valeur qui fait foi, pour
 * qu'un même compte retrouve son thème sur une autre machine.
 */
export function useThemePref() {
  const queryClient = useQueryClient();
  const prefs = useUserPrefs();
  const stored = prefs.data?.theme;
  const theme: Theme = isTheme(stored) ? stored : prefs.isSuccess ? "system" : cachedTheme();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Le thème du système peut changer pendant la session, écran veille ou horaire.
  const current = useRef(theme);
  current.current = theme;
  useEffect(() => watchSystemTheme(() => current.current), []);

  const save = useMutation({
    mutationFn: async (next: Theme) => {
      applyTheme(next);
      await savePrefs(queryClient, (currentPrefs) => ({ ...currentPrefs, theme: next }));
    },
  });

  return {
    theme,
    setTheme: (next: Theme) => {
      save.mutate(next);
    },
    isSaving: save.isPending,
    errorMessage: save.isError ? save.error.message : null,
  };
}

/**
 * Oublie les colonnes et le tri enregistrés pour toutes les vues.
 *
 * Seules ces deux clés sont retirées : l'ancienne interface range dans le même objet
 * la taille de page, ses filtres de colonne et l'état plié de ses sections, qui ne
 * sont pas les nôtres à effacer. Une vue dont il ne reste rien disparaît de `tables`.
 */
export function useResetViewPrefs() {
  const queryClient = useQueryClient();
  const reset = useMutation({
    mutationFn: async () =>
      savePrefs(queryClient, (current) => {
        const tables: Record<string, ViewPrefs | undefined> = {};
        for (const [view, entry] of Object.entries(current.tables ?? {})) {
          const rest = { ...entry };
          delete rest.visible_columns;
          delete rest.sort;
          if (Object.keys(rest).length > 0) tables[view] = rest;
        }
        return { ...current, tables };
      }),
  });
  return {
    reset: () => {
      reset.mutate();
    },
    isPending: reset.isPending,
    isDone: reset.isSuccess,
    errorMessage: reset.isError ? reset.error.message : null,
  };
}

/** Vrai si au moins une vue a des colonnes ou un tri enregistrés. */
export function hasSavedViewPrefs(prefs: UserPrefs | undefined): boolean {
  return Object.values(prefs?.tables ?? {}).some(
    (entry) => entry?.visible_columns !== undefined || entry?.sort !== undefined,
  );
}
