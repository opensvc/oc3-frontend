import { setCredentials } from "@/lib/api/auth";
import { queryClient } from "@/lib/query";

/**
 * Ends the session: forgets the credentials and empties the query cache.
 *
 * Without the second part, whoever signs in next in the same tab would see, for as
 * long as `staleTime` lasts, the data loaded for the previous user: query keys do not
 * carry the user, and `["user", "self"]` means "the signed-in user", whoever that is.
 */
export function signOut(): void {
  queryClient.clear();
  setCredentials(null);
}
