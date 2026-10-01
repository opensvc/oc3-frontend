import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { startImpersonating } from "@/lib/session";

/**
 * Whether the user who signed in holds the Manager privilege, which impersonating
 * requires (`GET /impersonation`): the entries that start an impersonation are
 * offered to them only.
 */
export function useCanImpersonate(): boolean {
  const { data } = useQuery({
    queryKey: ["impersonation"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: status, error } = await api.GET("/impersonation");
      if (error !== undefined) throw new Error(problemText(error));
      return status;
    },
  });
  return data?.allowed === true;
}

/**
 * Starts acting as the user designated by an id or an email: the server checks
 * the privilege and logs it (`POST /users/{user_id}/impersonate`), then every
 * request carries that user's id and the views start again from the dashboard, as
 * that user. Throws the server's refusal.
 */
export function useImpersonate(onStarted?: () => void) {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (user: string) => {
      const { data, error } = await api.POST("/users/{user_id}/impersonate", {
        params: { path: { user_id: user } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data;
    },
    onSuccess: (target) => {
      startImpersonating({ userId: target.user_id, email: target.email });
      onStarted?.();
      void navigate({ to: "/" });
    },
  });
}
