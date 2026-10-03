import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { problemText } from "./problem";

export const SESSION_FILTERSET_KEY = ["session-filterset"] as const;

/**
 * The session filterset of the signed-in user: the filterset the collector narrows
 * every list to (nodes, services, alerts, disks…), and that the report metrics
 * read; null when there is none. Kept server side, with the account, as in the
 * historical collector: it follows the user from one browser to another.
 */
export function useSessionFilterset() {
  return useQuery({
    queryKey: SESSION_FILTERSET_KEY,
    queryFn: async () => {
      const { data, error } = await api.GET("/users/self/filterset");
      if (error !== undefined) throw new Error(problemText(error));
      return data.data ?? null;
    },
  });
}

/** Everything read from the collector, but the session filterset itself, read again. */
export function refreshFilteredData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] !== SESSION_FILTERSET_KEY[0],
  });
}

/**
 * Chooses the session filterset, by name, or removes it with null; the views on
 * display are read again, narrowed or widened.
 */
export function useSetSessionFilterset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string | null) => {
      const { data, error } =
        name === null
          ? await api.DELETE("/users/self/filterset")
          : await api.PUT("/users/self/filterset", { body: { fset_id: name } });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data ?? null;
    },
    onSuccess: async (current) => {
      queryClient.setQueryData(SESSION_FILTERSET_KEY, current);
      await refreshFilteredData(queryClient);
    },
  });
}
