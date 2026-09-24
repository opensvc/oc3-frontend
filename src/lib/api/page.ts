/**
 * One page of a collector list, as the views hand it to `CollectorList`.
 *
 * `total` is the number of rows of the list without pagination, which apicollector
 * returns in `meta.total` as the historical collector did. It makes the page count
 * known, hence the first and last page buttons. An older apicollector does not
 * return it: the views still ask for one row more than the page, and `hasMore`
 * says from that extra row whether a next page exists.
 */
export interface ListPage<T> {
  rows: T[];
  hasMore: boolean;
  total?: number;
}

/** `meta.total` of a list response, when present and usable. */
function readTotal(meta: unknown): number | undefined {
  if (typeof meta !== "object" || meta === null || !("total" in meta)) return undefined;
  const { total } = meta as { total: unknown };
  return typeof total === "number" && Number.isInteger(total) && total >= 0 ? total : undefined;
}

/**
 * The page of a list response asked with `limit: pageSize + 1`: the rows on display,
 * whether more follow, and the total when the server gives it.
 */
export function toPage<T>(all: T[], meta: unknown, pageSize: number): ListPage<T> {
  return { rows: all.slice(0, pageSize), hasMore: all.length > pageSize, total: readTotal(meta) };
}
