/**
 * Per-column filters of a collector list.
 *
 * A filter is kept as the expression apicollector receives in its `filter` query
 * parameter, without the prop: `dev` (substring), `~^dev` (regular expression),
 * `in:up,warn`, `gte:8`, `empty`… The URL, the user preferences and the request all
 * carry that same expression, so that a link, a saved view and the query never
 * disagree. Only the controls translate it into something easier to type: the `.*`
 * toggle stands for the `~` prefix, `>=8` for `gte:8`.
 */

/** Prop → filter expression, for the active filters only. */
export type ColumnFilters = Record<string, string>;

/** Prefix of the URL keys holding a filter: `?f.nodename=~^dev`. */
export const FILTER_KEY_PREFIX = "f.";

export function filterKey(prop: string): `f.${string}` {
  return `f.${prop}`;
}

/** Filters found in a raw URL search object; empty values are dropped. */
export function filtersFromSearch(raw: object): ColumnFilters {
  const filters: ColumnFilters = {};
  for (const [key, value] of Object.entries(raw) as [string, unknown][]) {
    if (!key.startsWith(FILTER_KEY_PREFIX)) continue;
    const prop = key.slice(FILTER_KEY_PREFIX.length);
    // The router turns a numeric-looking value into a number: `f.ret=0`.
    const expr = typeof value === "number" ? String(value) : value;
    if (prop !== "" && typeof expr === "string" && expr !== "") filters[prop] = expr;
  }
  return filters;
}

/** Filters as apicollector's repeated `filter=prop:expr` parameter. */
export function filterQuery(filters: ColumnFilters): string[] | undefined {
  const entries = Object.entries(filters);
  return entries.length === 0 ? undefined : entries.map(([prop, expr]) => `${prop}:${expr}`);
}

/** Same filters, in a stable order: for query keys and comparisons. */
export function filtersKey(filters: ColumnFilters): string {
  return Object.keys(filters)
    .sort()
    .map((prop) => `${prop}:${filters[prop] ?? ""}`)
    .join("\n");
}

/** Filters with one prop set, or removed when `expr` is undefined. */
export function withFilter(
  filters: ColumnFilters,
  prop: string,
  expr: string | undefined,
): ColumnFilters {
  const next = { ...filters };
  if (expr === undefined || expr === "") {
    delete next[prop];
  } else {
    next[prop] = expr;
  }
  return next;
}

/**
 * Comparison operators typed in a text filter, and the prefix apicollector expects.
 * Two-character operators first, so that `>=` is not read as `>` followed by `=`.
 */
const OPERATORS = [
  [">=", "gte:"],
  ["<=", "lte:"],
  ["!=", "ne:"],
  [">", "gt:"],
  ["<", "lt:"],
  ["=", "eq:"],
] as const;

/** What a text filter shows: the text typed and the state of the regex toggle. */
export interface TextDraft {
  text: string;
  regex: boolean;
}

/** From the stored expression to what the text control shows. */
export function toTextDraft(expr: string | undefined): TextDraft {
  if (expr === undefined) return { text: "", regex: false };
  if (expr.startsWith("~")) return { text: expr.slice(1), regex: true };
  for (const [operator, prefix] of OPERATORS) {
    if (expr.startsWith(prefix))
      return { text: operator + expr.slice(prefix.length), regex: false };
  }
  return { text: expr, regex: false };
}

/**
 * From what was typed to the stored expression; undefined clears the filter.
 *
 * With the toggle on, the text is a regular expression. Otherwise a leading `~`
 * means the same thing, a leading comparison operator becomes its prefix, and
 * anything else is a substring. `empty` and `!empty` pass as they are.
 */
export function fromTextDraft({ text, regex }: TextDraft): string | undefined {
  const value = text.trim();
  if (value === "") return undefined;
  if (regex) return `~${value}`;
  if (value.startsWith("~")) return value.length > 1 ? value : undefined;
  for (const [operator, prefix] of OPERATORS) {
    if (value.startsWith(operator)) {
      const operand = value.slice(operator.length).trim();
      return operand === "" ? undefined : prefix + operand;
    }
  }
  return value;
}

/**
 * Why a regular expression would be refused, or null.
 *
 * The browser checks with its own engine: the API validates with Go's RE2, which
 * refuses a few constructs JavaScript accepts (look-arounds, back-references). The
 * server answers those with a 400, shown as a list error; this check catches the
 * common typing mistakes before any request.
 */
export function regexError(expr: string | undefined): string | null {
  if (expr?.startsWith("~") !== true) return null;
  try {
    new RegExp(expr.slice(1));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Values chosen in an enumerated filter: `in:a,b`, or a single `eq:a`. */
export function toEnumValues(expr: string | undefined): string[] {
  if (expr === undefined) return [];
  if (expr.startsWith("in:")) return expr.slice(3).split(",").filter(Boolean);
  if (expr.startsWith("eq:")) return [expr.slice(3)];
  return [];
}

export function fromEnumValues(values: string[]): string | undefined {
  return values.length === 0 ? undefined : `in:${values.join(",")}`;
}
