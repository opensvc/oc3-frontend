import { useQueryClient } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { setCredentials, useCredentials } from "@/lib/api/auth";
import { setImpersonation, useImpersonation } from "@/lib/api/impersonation";
import { EDITABLE_USER_PROPS } from "./user-fields";

type UserRow = components["schemas"]["UserRow"];
type UserChange = { first_name?: string; last_name?: string; email?: string };

/**
 * Saves a change of a user's name or email (`POST /users/{user_id}`): the
 * signed-in user's own, or anyone's for a UserManager, the server judging. When
 * `isSelf`, a changed email carries the session on at once: the email is the
 * sign-in name, and the old one no longer authenticates. Throws the server's
 * message, shown under the field being edited.
 */
export function useSaveUser(userId: string | undefined, isSelf: boolean) {
  const queryClient = useQueryClient();
  const credentials = useCredentials();
  const impersonation = useImpersonation();
  return async (patch: Record<string, unknown>) => {
    if (userId === undefined) return;
    const body: UserChange = {};
    for (const key of EDITABLE_USER_PROPS) {
      const value = patch[key];
      if (typeof value === "string") body[key as keyof UserChange] = value;
    }
    const { data, error } = await api.POST("/users/{user_id}", {
      params: { path: { user_id: userId } },
      body,
    });
    if (error !== undefined) throw new Error(problemText(error));
    const row: UserRow | undefined = Array.isArray(data.data) ? data.data[0] : undefined;
    const email = row?.email;
    if (isSelf && email !== undefined && email !== "") {
      // Acting as another user: their sign-in name is not the session's.
      if (impersonation !== null) {
        if (email !== impersonation.email) setImpersonation({ ...impersonation, email });
      } else if (credentials !== null && email !== credentials.user) {
        setCredentials({ ...credentials, user: email });
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["user"] });
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };
}
