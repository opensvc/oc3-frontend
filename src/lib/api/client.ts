import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { authorizationHeader } from "./auth";
import { signOut } from "@/lib/session";

/**
 * Client HTTP typé depuis la spec OpenAPI d'oc3 apicollector.
 * En dev, /api est proxifié par Vite vers OC3_API_TARGET.
 */
export const api = createClient<paths>({ baseUrl: "/api" });

api.use({
  onRequest({ request }) {
    const header = authorizationHeader();
    if (header !== null) request.headers.set("Authorization", header);
    return request;
  },
  onResponse({ response }) {
    // Identifiants refusés ou expirés : on repasse par l'écran de connexion
    // plutôt que de laisser les vues afficher une erreur qu'on sait résoudre.
    // Via signOut : le cache de la session refusée ne doit pas survivre.
    if (response.status === 401) signOut();
    return response;
  },
});
