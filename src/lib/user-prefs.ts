import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./api/client";
import { problemText } from "./api/problem";
import type { ListSearch } from "./list-search";
import { applyTheme, cachedTheme, isTheme, watchSystemTheme, type Theme } from "./theme";

/**
 * User preferences, as the historical collector keeps them in the `prefs` column of
 * `user_prefs`: a free JSON object, stored as it is by `POST /users/self/prefs`. The
 * visible columns of a view live under `tables.<view>.visible_columns`, as in
 * `init/static/js/osvc/tables/table.js`, so that an account finds its columns again
 * from one interface to the other. The sort sits next to them, under
 * `tables.<view>.sort`: the old interface did not keep it, so that key is unknown to
 * it and without effect there.
 *
 * The rest of the object — column filters, live mode, hidden menu entries — belongs
 * to the old interface: it is read back and stored again untouched.
 */
/** Preferences of a view: what follows the account rather than the URL. */
export interface ViewPrefs {
  visible_columns?: string[];
  /** Sort keys, prefixed with `-` for descending order, as in the URL. */
  sort?: string[];
}

export interface UserPrefs {
  tables?: Record<string, ViewPrefs | undefined>;
  /** Chosen theme; absent means "system". */
  theme?: string;
  [key: string]: unknown;
}

const PREFS_KEY = ["user", "self", "prefs"];

/** Write delay, as in the old collector: ticking three columns writes only once. */
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

/** Current preferences, loaded once and shared by every view. */
export function useUserPrefs() {
  return useQuery({ queryKey: PREFS_KEY, queryFn: fetchPrefs, staleTime: 5 * 60 * 1000 });
}

/**
 * Columns and sort saved for a view, and what it takes to update them.
 *
 * The URL keeps priority: a shared link shows its columns and its sort, not those of
 * whoever opens it. Preferences therefore only serve when the URL carries none, and
 * going back to the default columns clears the saved entry.
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

  /** Saves after a short delay; a new call cancels the previous one. */
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

/** One timer per view and per key: two writes do not cancel each other. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function ensurePrefs(queryClient: QueryClient): Promise<UserPrefs> {
  return asPrefs(await queryClient.fetchQuery({ queryKey: PREFS_KEY, queryFn: fetchPrefs }));
}

/**
 * Applies a change to the preferences object and saves it.
 *
 * The object is read back before being written again: the server replaces the whole
 * of it, and another view may have saved its columns in the meantime.
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
 * Completes the URL state of a view with its preferences, before resolving it: the
 * URL wins, preferences only fill in what it does not carry.
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
 * Chosen theme, applied and saved.
 *
 * The locally cached theme applies from startup (`src/main.tsx`); as soon as the
 * account preferences arrive, their value is the one that counts, so that the same
 * account finds its theme again on another machine.
 */
export function useThemePref() {
  const queryClient = useQueryClient();
  const prefs = useUserPrefs();
  const stored = prefs.data?.theme;
  const theme: Theme = isTheme(stored) ? stored : prefs.isSuccess ? "system" : cachedTheme();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // The system theme may change during the session, from a sleeping screen or an hour.
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
 * Forgets the columns and the sort saved for every view.
 *
 * Only those two keys are removed: the old interface keeps the page size, its column
 * filters and the folded state of its sections in the same object, and those are not
 * ours to clear. A view left with nothing disappears from `tables`.
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

/** True when at least one view has saved columns or a saved sort. */
export function hasSavedViewPrefs(prefs: UserPrefs | undefined): boolean {
  return Object.values(prefs?.tables ?? {}).some(
    (entry) => entry?.visible_columns !== undefined || entry?.sort !== undefined,
  );
}
