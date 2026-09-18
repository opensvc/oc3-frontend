/**
 * Message d'erreur d'apicollector. Les erreurs sont renvoyées en `{"text": "…"}` ;
 * on retombe sur la forme brute si ce n'est pas le cas.
 */
export function problemText(error: unknown): string {
  if (typeof error === "object" && error !== null && "text" in error) {
    const { text } = error as { text: unknown };
    if (typeof text === "string") return text;
  }
  return JSON.stringify(error);
}
