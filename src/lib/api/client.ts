import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { authorizationHeader } from "./auth";
import { signOut } from "@/lib/session";

/**
 * HTTP client typed from the OpenAPI spec of the oc3 apicollector.
 * In dev, /api is proxied by Vite to OC3_API_TARGET.
 */
export const api = createClient<paths>({ baseUrl: "/api" });

api.use({
  onRequest({ request }) {
    const header = authorizationHeader();
    if (header !== null) request.headers.set("Authorization", header);
    return request;
  },
  onResponse({ response }) {
    // Credentials refused or expired: back to the sign-in screen rather than leaving
    // the views showing an error we know how to resolve.
    // Through signOut: the cache of the refused session must not survive.
    if (response.status === 401) signOut();
    return response;
  },
});
