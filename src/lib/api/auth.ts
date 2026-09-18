import { useSyncExternalStore } from "react";

/**
 * Identifiants du collector, conservés le temps de l'onglet.
 *
 * Provisoire : oc3 n'implémente aujourd'hui que l'authentification HTTP Basic
 * (mot de passe d'utilisateur web2py, uuid de node). Le mode retenu à terme est
 * OIDC. Tout ce qui touche aux identifiants est donc isolé ici, pour être
 * remplacé d'un bloc sans que les vues en dépendent.
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
    // Stockage illisible ou refusé : on repart d'une session vide.
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
    // Navigation privée ou stockage refusé : la session ne survit pas au rechargement.
  }
  for (const listener of listeners) listener();
}

export function useCredentials(): Credentials | null {
  return useSyncExternalStore(subscribe, snapshot);
}

/** En-tête Authorization de la requête courante, ou null si personne n'est connecté. */
export function authorizationHeader(): string | null {
  if (current === null) return null;
  // btoa n'accepte que du latin-1 : on passe par l'encodage UTF-8 des octets.
  const bytes = new TextEncoder().encode(`${current.user}:${current.password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
}
