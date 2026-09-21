/**
 * Error message from apicollector. Errors come back as `{"text": "…"}`; we fall back
 * to the raw shape when they do not.
 */
export function problemText(error: unknown): string {
  if (typeof error === "object" && error !== null && "text" in error) {
    const { text } = error as { text: unknown };
    if (typeof text === "string") return text;
  }
  return JSON.stringify(error);
}
