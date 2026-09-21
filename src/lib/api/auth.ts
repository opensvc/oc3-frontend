import { useSyncExternalStore } from "react";

/**
 * Collector credentials, kept for the lifetime of the tab.
 *
 * A stopgap: oc3 currently implements HTTP Basic authentication only (web2py user
 * password, node uuid). The mode intended in the end is OIDC. Everything touching
 * credentials is therefore isolated here, to be replaced in one piece without the
 * views depending on it.
 */
export interface Credentials {
  user: string;
  password: string;
}

const STORAGE_KEY = "oc3.credentials";

function read(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "user" in parsed &&
      "password" in parsed &&
      typeof parsed.user === "string" &&
      typeof parsed.password === "string"
    ) {
      return { user: parsed.user, password: parsed.password };
    }
    return null;
  } catch {
    // Storage unreadable or refused: we start again from an empty session.
    return null;
  }
}

let current: Credentials | null = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): Credentials | null {
  return current;
}

export function setCredentials(next: Credentials | null): void {
  if (next === current) return;
  current = next;
  try {
    if (next === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or storage refused: the session does not survive a reload.
  }
  for (const listener of listeners) listener();
}

export function useCredentials(): Credentials | null {
  return useSyncExternalStore(subscribe, snapshot);
}

/** Authorization header of the current request, or null when nobody is signed in. */
export function authorizationHeader(): string | null {
  if (current === null) return null;
  // btoa n'accepte que du latin-1 : on passe par l'encodage UTF-8 des octets.
  const bytes = new TextEncoder().encode(`${current.user}:${current.password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
}
