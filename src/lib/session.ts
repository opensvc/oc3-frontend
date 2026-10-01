import { setCredentials } from "@/lib/api/auth";
import { impersonationHeader, setImpersonation, type Impersonation } from "@/lib/api/impersonation";
import { queryClient } from "@/lib/query";

/**
 * Ends the session: forgets the credentials and the impersonation, and empties
 * the query cache.
 *
 * Without the last part, whoever signs in next in the same tab would see, for as
 * long as `staleTime` lasts, the data loaded for the previous user: query keys do not
 * carry the user, and `["user", "self"]` means "the signed-in user", whoever that is.
 */
export function signOut(): void {
  queryClient.clear();
  setImpersonation(null);
  setCredentials(null);
}

/**
 * Acts as another user from now on, or with null as oneself again. The cache goes
 * for the same reason as at sign-out: the views reload as the new identity.
 */
function switchIdentity(next: Impersonation | null): void {
  // Several requests in flight may be refused together: one switch is enough.
  if (next === null && impersonationHeader() === null) return;
  queryClient.clear();
  setImpersonation(next);
}

export function startImpersonating(target: Impersonation): void {
  switchIdentity(target);
}

export function stopImpersonating(): void {
  switchIdentity(null);
}
