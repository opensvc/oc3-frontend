import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./api/client";
import { problemText } from "./api/problem";
import { FILTER_KEY_PREFIX, filterKey, type ColumnFilters } from "./column-filters";
import type { ListSearch } from "./list-search";
import { applyTheme, cachedTheme, isTheme, watchSystemTheme, type Theme } from "./theme";

/**
 * User preferences, as the historical collector keeps them in the `prefs` column of
 * `user_prefs`: a free JSON object, stored as it is by `POST /users/self/prefs`. The
 * visible columns of a view live under `tables.<view>.visible_columns`, as in
 * `init/static/js/osvc/tables/table.js`, so that an account finds its columns again
 * from one interface to the other. The sort sits next to them, under
 * `tables.<view>.sort`: the old interface did not keep it, so that key is unknown to
 * it and without effect there. Column filters follow under
 * `tables.<view>.column_filters`, in the apicollector syntax: the old interface keeps
 * its own, in another syntax, under `filters`, and each ignores the other's.
 *
 * The rest of the object — the old column filters, live mode, hidden menu entries —
 * belongs to the old interface: it is read back and stored again untouched.
 */
/** Preferences of a view: what follows the account rather than the URL. */
export interface ViewPrefs {
  visible_columns?: string[];
  /** Sort keys, prefixed with `-` for descending order, as in the URL. */
  sort?: string[];
  /** Column filters, prop → apicollector expression, as in the URL. */
  column_filters?: ColumnFilters;
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
 * Columns, sort and filters saved for a view, and what it takes to update them.
 *
 * The URL keeps priority: a shared link shows its columns, its sort and its filters,
 * not those of whoever opens it. Preferences therefore only serve when the URL carries
 * none, and going back to the defaults clears the saved entry.
 */
export function useViewPrefs(view: string) {
  const queryClient = useQueryClient();
  const prefs = useUserPrefs();

  function save<K extends keyof ViewPrefs>(key: K, value: ViewPrefs[K]) {
    const empty =
      value === undefined ||
      (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0);
    schedule(queryClient, `${view}:${key}`, (current) => {
      const tables = { ...current.tables };
      const entry: ViewPrefs = { ...tables[view] };
      if (empty) {
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
    });
  }

  const entry = prefs.data?.tables?.[view];
  return {
    cols: entry?.visible_columns,
    sort: entry?.sort,
    filters: entry?.column_filters,
    saveCols: (cols: string[] | undefined) => {
      save("visible_columns", cols);
    },
    saveSort: (sort: string[] | undefined) => {
      save("sort", sort);
    },
    saveFilters: (filters: ColumnFilters | undefined) => {
      save("column_filters", filters);
    },
  };
}

type PrefsChange = (current: UserPrefs) => UserPrefs;

/** Changes waiting to be written, one per view and key: a newer one replaces it. */
const pending = new Map<string, PrefsChange>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

/** Changes scheduled but not written yet, over a state read from the server. */
function applyPending(prefs: UserPrefs): UserPrefs {
  return [...pending.values()].reduce((current, change) => change(current), prefs);
}

/**
 * Applies a change at once to the cached preferences and writes it a little later.
 *
 * The view reads its state from the cache: without the immediate update, a filter
 * just cleared from the URL would come back from the saved preferences until the
 * write lands. The write itself waits, as in the old collector, so that ticking three
 * columns or typing a filter writes only once.
 */
function schedule(queryClient: QueryClient, id: string, change: PrefsChange) {
  pending.set(id, change);
  queryClient.setQueryData<UserPrefs>(PREFS_KEY, (current) => change(asPrefs(current)));
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    const changes = [...pending.values()];
    pending.clear();
    savePrefs(queryClient, (current) =>
      changes.reduce((prefs, apply) => apply(prefs), current),
    ).catch(() => {
      // The cache holds a state the server refused: read the stored one again.
      void queryClient.invalidateQueries({ queryKey: PREFS_KEY });
    });
  }, SAVE_DELAY);
}

/**
 * Applies a change to the preferences object and saves it.
 *
 * The object is read back before being written again: the server replaces the whole
 * of it, and another tab may have saved its columns in the meantime. It is read
 * outside the cache, which holds changes not written yet; those are applied again
 * over the stored state once it is saved.
 */
export async function savePrefs(
  queryClient: QueryClient,
  change: (current: UserPrefs) => UserPrefs,
): Promise<void> {
  const next = change(await fetchPrefs());
  const { error } = await api.POST("/users/{user_id}/prefs", {
    params: { path: { user_id: "self" } },
    body: { data: next },
  });
  if (error !== undefined) throw new Error(problemText(error));
  queryClient.setQueryData(PREFS_KEY, applyPending(next));
}

/**
 * Completes the URL state of a view with its preferences, before resolving it: the
 * URL wins, preferences only fill in what it does not carry.
 */
export function withSavedSearch(
  search: ListSearch,
  saved: { cols?: string[]; sort?: string[]; filters?: ColumnFilters },
): ListSearch {
  // Filters go as a whole: a link filtering on one column does not inherit the
  // saved filters of the others.
  const urlFilters = Object.keys(search).some((key) => key.startsWith(FILTER_KEY_PREFIX));
  const savedFilters = urlFilters
    ? {}
    : Object.fromEntries(
        Object.entries(saved.filters ?? {}).map(([prop, expr]) => [filterKey(prop), expr]),
      );
  return {
    ...savedFilters,
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
 * Forgets the columns, the sort and the column filters saved for every view.
 *
 * Only those keys are removed: the old interface keeps the page size, its column
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
          delete rest.column_filters;
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

/** True when at least one view has saved columns, sort or filters. */
export function hasSavedViewPrefs(prefs: UserPrefs | undefined): boolean {
  return Object.values(prefs?.tables ?? {}).some(
    (entry) =>
      entry?.visible_columns !== undefined ||
      entry?.sort !== undefined ||
      entry?.column_filters !== undefined,
  );
}
