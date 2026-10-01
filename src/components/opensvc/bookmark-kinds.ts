/** Kinds of object a bookmark can reopen over any view, through `PeekPanel`. */
export const BOOKMARK_KINDS: ReadonlySet<string> = new Set([
  "node",
  "service",
  "instance",
  "app",
  "group",
  "user",
  "tag",
  "disk",
  "network",
  "metric",
  "chart",
  "report",
]);
