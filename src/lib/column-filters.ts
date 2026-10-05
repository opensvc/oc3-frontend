/**
 * Per-column filters of a collector list.
 *
 * A filter is kept as the expression apicollector receives in its `filter` query
 * parameter, without the prop: `dev` (substring), `~^dev` (regular expression),
 * `in:up,warn`, `gte:8`, `empty`… A leading `!` inverts any of them: `!dev` keeps
 * the rows `dev` leaves out. The URL, the user preferences and the request all
 * carry that same expression, so that a link, a saved view and the query never
 * disagree. Only the controls translate it into something easier to type: the `.*`
 * toggle stands for the `~` prefix, the `≠` toggle for the `!` one, `>=8` for
 * `gte:8`.
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

/** Prefix inverting a filter expression. A `!` alone is the text "!", as for the API. */
const NOT = "!";

/** Whether the expression is an inverted one: `!dev`, `!in:a,b`, `!empty`. */
export function isInverted(expr: string | undefined): boolean {
  return expr !== undefined && expr.startsWith(NOT) && expr.length > NOT.length;
}

/** The expression without its inversion. */
function positive(expr: string): string {
  return isInverted(expr) ? expr.slice(NOT.length) : expr;
}

/** The same filter, keeping the rows it left out: `dev` ⇄ `!dev`. */
export function invertFilter(expr: string): string {
  return isInverted(expr) ? expr.slice(NOT.length) : NOT + expr;
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

/** What a text filter shows: the text typed and the state of its two toggles. */
export interface TextDraft {
  text: string;
  regex: boolean;
  /** Inverted: the rows that do not match. */
  inverted: boolean;
}

/** From the stored expression to what the text control shows. */
export function toTextDraft(expr: string | undefined): TextDraft {
  if (expr === undefined) return { text: "", regex: false, inverted: false };
  const inverted = isInverted(expr);
  const inner = positive(expr);
  if (inner.startsWith("~")) return { text: inner.slice(1), regex: true, inverted };
  for (const [operator, prefix] of OPERATORS) {
    if (inner.startsWith(prefix))
      return { text: operator + inner.slice(prefix.length), regex: false, inverted };
  }
  return { text: inner, regex: false, inverted };
}

/**
 * From what was typed to the stored expression; undefined clears the filter.
 *
 * With the regex toggle on, the text is a regular expression. Otherwise a leading
 * `~` means the same thing, a leading comparison operator becomes its prefix, and
 * anything else is a substring. `empty` passes as it is. A typed leading `!` flips
 * the inversion, as the `≠` toggle does; `!=` is the "not equal" operator.
 */
export function fromTextDraft({ text, regex, inverted }: TextDraft): string | undefined {
  let value = text.trim();
  let not = inverted;
  if (!regex && value.startsWith(NOT) && !value.startsWith("!=") && value.length > NOT.length) {
    value = value.slice(NOT.length).trim();
    not = !not;
  }
  const expr = textExpr(value, regex);
  return expr === undefined ? undefined : not ? NOT + expr : expr;
}

function textExpr(value: string, regex: boolean): string | undefined {
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
  const inner = expr === undefined ? undefined : positive(expr);
  if (inner?.startsWith("~") !== true) return null;
  try {
    new RegExp(inner.slice(1));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Values chosen in an enumerated filter: `in:a,b`, or a single `eq:a`; the values
 * left out when the filter is inverted (`!in:a,b`, see `isInverted`).
 */
export function toEnumValues(expr: string | undefined): string[] {
  if (expr === undefined) return [];
  const inner = positive(expr);
  if (inner.startsWith("in:")) return inner.slice(3).split(",").filter(Boolean);
  if (inner.startsWith("eq:")) return [inner.slice(3)];
  return [];
}

export function fromEnumValues(values: string[], inverted = false): string | undefined {
  if (values.length === 0) return undefined;
  return `${inverted ? NOT : ""}in:${values.join(",")}`;
}

/** The value apicollector counts null and blank values under, and filters them with. */
export const EMPTY_VALUE = "empty";

/**
 * The values a filter picks exactly, inverted or not: `eq:v`, `in:a,b` or `empty`.
 * A substring, a regular expression or a comparison picks none.
 */
export function toPickedValues(expr: string | undefined): string[] {
  if (expr === undefined) return [];
  if (positive(expr) === EMPTY_VALUE) return [EMPTY_VALUE];
  return toEnumValues(expr);
}

/**
 * The filter picking exactly `values`: `eq:v` for one, `in:a,b` for several,
 * `empty` for the empty one; undefined for none. See canPickWithOthers.
 */
export function fromPickedValues(values: string[], inverted = false): string | undefined {
  const [first] = values;
  if (first === undefined) return undefined;
  const expr =
    values.length > 1
      ? `in:${values.join(",")}`
      : first === EMPTY_VALUE
        ? EMPTY_VALUE
        : `eq:${first}`;
  return inverted ? NOT + expr : expr;
}

/**
 * Whether a value can be picked along with others: `in:` separates its values with
 * commas, and has no way to name the empty one.
 */
export function canPickWithOthers(value: string): boolean {
  return value !== EMPTY_VALUE && !value.includes(",");
}
