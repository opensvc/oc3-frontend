import { useSyncExternalStore } from "react";
import { useCredentials } from "./auth";

/**
 * The user the signed-in administrator acts as, kept for the lifetime of the tab.
 *
 * oc3 is stateless: each request made as that user carries its id in the
 * `OC3-Impersonate` header, which the server checks against the Impersonate
 * privilege every time. Stopping is forgetting it.
 */
export interface Impersonation {
  userId: number;
  email: string;
}

const STORAGE_KEY = "oc3.impersonation";

/** Request header naming the impersonated user. */
export const IMPERSONATE_HEADER = "OC3-Impersonate";
/** Response header marking a refusal due to the impersonation itself. */
export const IMPERSONATION_REFUSED_HEADER = "OC3-Impersonation-Refused";

function read(): Impersonation | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "userId" in parsed &&
      "email" in parsed &&
      typeof parsed.userId === "number" &&
      typeof parsed.email === "string"
    ) {
      return { userId: parsed.userId, email: parsed.email };
    }
    return null;
  } catch {
    // Storage unreadable or refused: the tab acts as the signed-in user.
    return null;
  }
}

let current: Impersonation | null = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): Impersonation | null {
  return current;
}

/**
 * Sets, or with null forgets, the impersonated user. Callers empty the query
 * cache with it: the data loaded as one user must not show as the other's.
 */
export function setImpersonation(next: Impersonation | null): void {
  if (next?.userId === current?.userId && next?.email === current?.email) return;
  current = next;
  try {
    if (next === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or storage refused: the impersonation ends with a reload.
  }
  for (const listener of listeners) listener();
}

export function useImpersonation(): Impersonation | null {
  return useSyncExternalStore(subscribe, snapshot);
}

/** Value of the impersonation header of the current request, or null. */
export function impersonationHeader(): string | null {
  return current === null ? null : String(current.userId);
}

/**
 * Email of the user the requests are made as: the impersonated user, or the one
 * who signed in. Null when nobody is signed in.
 */
export function useEffectiveUser(): string | null {
  const credentials = useCredentials();
  const impersonation = useImpersonation();
  if (credentials === null) return null;
  return impersonation?.email ?? credentials.user;
}
