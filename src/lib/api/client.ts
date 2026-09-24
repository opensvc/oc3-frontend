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

/** Answer of an API call on a path known only at runtime. */
export interface DynamicResponse {
  status: number;
  body: unknown;
}

/**
 * GET on an API path known only at runtime, such as the candidates a form
 * definition fetches from any collector endpoint: the typed client needs the path
 * at compile time. Same credentials and same handling of a refused session as
 * `api`. Repeated query keys carry a list.
 */
export async function apiGetDynamic(
  path: string,
  query: Record<string, string | string[]>,
): Promise<DynamicResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
  }
  const headers = new Headers({ Accept: "application/json" });
  const header = authorizationHeader();
  if (header !== null) headers.set("Authorization", header);
  const qs = params.toString();
  const response = await fetch(`/api${path}${qs === "" ? "" : `?${qs}`}`, { headers });
  if (response.status === 401) signOut();
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    // Not JSON: the text itself, for the error message.
  }
  return { status: response.status, body };
}
