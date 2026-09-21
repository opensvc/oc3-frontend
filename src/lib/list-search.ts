/**
 * URL state shared by the "collector list" views: sort, pagination, filterset,
 * visible columns and selected row. The "definition of done" grid asks for these
 * states to be shareable by link alone.
 *
 * Two shapes coexist on purpose:
 *
 * - `ListSearch` is what travels through the URL. Scalars only: the router
 *   serialises any non-primitive value as JSON, which would give links such as
 *   `?sort=%5B%22-mem_bytes%22%5D`. Lists are therefore written in plain text,
 *   separated by commas.
 * - `ResolvedListSearch` is what the components handle, with real lists.
 *
 * `parseListSearch` and `toSearchParams` convert at both boundaries.
 */
export interface ListSearch {
  /** Sort keys separated by commas, prefixed with - for descending order. */
  sort?: string;
  offset?: number;
  limit?: number;
  /** Name of the applied filterset, absent for the full list. */
  fset?: string;
  /** Id of the row whose detail panel is open. */
  sel?: string;
  /** Props des colonnes visibles ; absent signifie « toutes les colonnes de la vue ». */
  cols?: string;
  /**
   * Tab open in the detail panel. In the URL so that a link, a reload or the Back
   * button reopen the same tab.
   */
  tab?: string;
  /**
   * Object from another view looked at without leaving this one, as `kind:id`: a
   * badge in a cell opens its record in place of the row panel. In the URL like the
   * rest, so that a link reopens it.
   */
  peek?: string;
  /** Tab open in that panel, when the object looked at has any. */
  peektab?: string;
}

export interface ResolvedListSearch {
  sort: string[];
  offset: number;
  limit: number;
  fset: string;
  sel?: string;
  cols?: string[];
  tab?: string;
  peek?: string;
  peektab?: string;
}

export const PAGE_SIZES = [25, 50, 100] as const;

const DEFAULT_LIMIT = 50;

function toPositiveInt(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function toNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * Accepts "a,b" as well as a real array: a link shared before this state moved to
 * strings still carries an array serialised as JSON, which the router hands back as
 * it is.
 */
function toCommaList(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item !== "");
    return items.length === 0 ? undefined : items.join(",");
  }
  return toNonEmptyString(value);
}

export function parseListSearch(raw: Record<string, unknown>): ListSearch {
  const limit = toPositiveInt(raw.limit);
  return {
    sort: toCommaList(raw.sort),
    offset: toPositiveInt(raw.offset),
    limit: PAGE_SIZES.some((size) => size === limit) ? limit : undefined,
    fset: toNonEmptyString(raw.fset),
    sel: toNonEmptyString(raw.sel),
    cols: toCommaList(raw.cols),
    tab: toNonEmptyString(raw.tab),
    peek: toNonEmptyString(raw.peek),
    peektab: toNonEmptyString(raw.peektab),
  };
}

export function resolveListSearch(search: ListSearch, defaultSort: string[]): ResolvedListSearch {
  return {
    sort: search.sort?.split(",") ?? defaultSort,
    offset: search.offset ?? 0,
    limit: search.limit ?? DEFAULT_LIMIT,
    fset: search.fset ?? "",
    sel: search.sel,
    cols: search.cols?.split(","),
    tab: search.tab,
    peek: search.peek,
    peektab: search.peektab,
  };
}

/**
 * Translates an update coming from a component into the URL shape. An absent key
 * leaves the previous value; a key set to `undefined` clears it. Default values are
 * cleared rather than written, so that the URL carries only what departs from the
 * base view.
 */
export function toSearchParams(next: Partial<ResolvedListSearch>): Partial<ListSearch> {
  const out: Partial<ListSearch> = {};
  if ("sort" in next)
    out.sort = next.sort === undefined || next.sort.length === 0 ? undefined : next.sort.join(",");
  if ("cols" in next)
    out.cols = next.cols === undefined || next.cols.length === 0 ? undefined : next.cols.join(",");
  if ("offset" in next) out.offset = next.offset === 0 ? undefined : next.offset;
  if ("limit" in next) out.limit = next.limit === DEFAULT_LIMIT ? undefined : next.limit;
  if ("fset" in next) out.fset = next.fset === "" ? undefined : next.fset;
  // One drawer at a time: opening a row panel closes the record a badge had opened,
  // just as the badge closes the row panel.
  if ("sel" in next) {
    out.sel = next.sel;
    out.peek = undefined;
    out.peektab = undefined;
  }
  if ("tab" in next) out.tab = next.tab;
  if ("peek" in next) out.peek = next.peek;
  if ("peektab" in next) out.peektab = next.peektab;
  return out;
}

/**
 * Visible columns, in the order the view declares them.
 *
 * Without a selection in the URL, these are the view's default columns and not all
 * of them: a view may offer dozens without imposing them. Props unknown to an old or
 * hand-made URL are ignored, and an empty selection falls back to the default
 * columns, a table without a column having nothing to show.
 */
export function visibleProps(
  cols: string[] | undefined,
  defaultCols: string[],
  allProps: string[],
): string[] {
  if (cols === undefined) return defaultCols;
  const kept = allProps.filter((prop) => cols.includes(prop));
  return kept.length === 0 ? defaultCols : kept;
}

/**
 * States that do not replace the rows on display: open detail panel, its tab,
 * visible columns.
 */
const IN_PLACE_KEYS = new Set<keyof ResolvedListSearch>(["sel", "tab", "cols", "peek", "peektab"]);

/**
 * Should the page scroll back to the top after this URL update?
 *
 * The router does it by default on every navigation. That is wanted when the page,
 * the sort or the filterset change the rows on display, but not when opening the
 * detail of a row reached by scrolling: the list would jump under the panel and the
 * place would be lost on closing it.
 */
export function resetsScroll(next: Partial<ResolvedListSearch>): boolean {
  return Object.keys(next).some((key) => !IN_PLACE_KEYS.has(key as keyof ResolvedListSearch));
}
