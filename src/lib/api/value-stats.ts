/** A value of a column and the number of rows holding it. */
export interface ValueCount {
  value: string;
  count: number;
}

/**
 * The distribution of the values of a column over the selection of a list, as
 * `stats=1` answers it: the most frequent values first, how many there are in
 * all, how many rows the left-out ones hold, and the rows counted.
 */
export interface ValueStats {
  values: ValueCount[];
  distinct: number;
  other: number;
  total: number;
}

/** Values asked for a column: beyond, they are summed up as "other". */
export const STATS_LIMIT = 20;

/**
 * Reads a `stats=1` response. The schema of the lists describes their rows, not
 * this shape, hence the checks: anything unexpected reads as no value.
 */
export function toValueStats(data: unknown, meta: unknown, prop: string): ValueStats {
  const counts = field(data, prop);
  const values: ValueCount[] = [];
  if (typeof counts === "object" && counts !== null)
    for (const [value, count] of Object.entries(counts))
      if (typeof count === "number") values.push({ value, count });
  values.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  const listed = values.reduce((sum, item) => sum + item.count, 0);
  return {
    values,
    distinct: numberOr(field(field(meta, "distinct"), prop), values.length),
    other: numberOr(field(field(meta, "other"), prop), 0),
    total: numberOr(field(meta, "total"), listed),
  };
}

function field(object: unknown, key: string): unknown {
  return typeof object === "object" && object !== null && key in object
    ? (object as Record<string, unknown>)[key]
    : undefined;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}
