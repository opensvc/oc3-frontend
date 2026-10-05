import { readProp } from "./row";

/** The rows holding one value of an attribute. */
export interface ValueGroup<T> {
  /** The value as compared: its text, or `null` for an empty value. */
  key: string | null;
  rows: T[];
}

/**
 * An attribute of a set of rows: its values grouped, the most held first, and
 * its commonality, the share of the rows holding the most held value.
 */
export interface Attribute<T> {
  prop: string;
  groups: ValueGroup<T>[];
  /** From 1/n to 1: 1 when every row holds the same value. */
  share: number;
  /** Every row holds the same value. */
  shared: boolean;
  /** Every row holds an empty value. */
  empty: boolean;
}

/**
 * How a value is compared: numbers and booleans by their text, objects by their
 * JSON, null, undefined and blank strings as one empty value.
 */
export function valueKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    return String(value);
  return JSON.stringify(value);
}

/**
 * Compares the rows on each prop, the most common attributes first: by
 * decreasing commonality, then by fewer distinct values, then in the order of
 * `props`. The attributes empty in every row come last, as they say nothing of
 * what the rows share.
 */
export function compareRows<T>(rows: readonly T[], props: readonly string[]): Attribute<T>[] {
  const attributes = props.map((prop, index) => {
    const byKey = new Map<string | null, T[]>();
    for (const row of rows) {
      const key = valueKey(readProp(row, prop));
      const group = byKey.get(key);
      if (group === undefined) byKey.set(key, [row]);
      else group.push(row);
    }
    // The most held first; the empty value after the others it ties with.
    const groups = [...byKey.entries()]
      .map(([key, members]) => ({ key, rows: members }))
      .sort(
        (a, b) =>
          b.rows.length - a.rows.length ||
          Number(a.key === null) - Number(b.key === null) ||
          (a.key ?? "").localeCompare(b.key ?? ""),
      );
    const top = groups[0]?.rows.length ?? 0;
    const attribute: Attribute<T> = {
      prop,
      groups,
      share: rows.length === 0 ? 0 : top / rows.length,
      shared: groups.length === 1,
      empty: groups.length === 1 && groups[0]?.key === null,
    };
    return { attribute, index };
  });
  return attributes
    .sort(
      (a, b) =>
        Number(a.attribute.empty) - Number(b.attribute.empty) ||
        b.attribute.share - a.attribute.share ||
        a.attribute.groups.length - b.attribute.groups.length ||
        a.index - b.index,
    )
    .map(({ attribute }) => attribute);
}

/**
 * The rows holding the lowest and the highest value of a numeric or dated
 * attribute, empty values aside; undefined when no row holds a value.
 */
export function valueRange<T>(
  rows: readonly T[],
  prop: string,
  measure: (value: unknown) => number | undefined,
): { min: T; max: T } | undefined {
  let min: { row: T; value: number } | undefined;
  let max: { row: T; value: number } | undefined;
  for (const row of rows) {
    const value = measure(readProp(row, prop));
    if (value === undefined || Number.isNaN(value)) continue;
    if (min === undefined || value < min.value) min = { row, value };
    if (max === undefined || value > max.value) max = { row, value };
  }
  return min === undefined || max === undefined ? undefined : { min: min.row, max: max.row };
}

/** A number, or a number written as text. */
export function numericValue(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return undefined;
}

/** A date as the collector writes it, in milliseconds. */
export function dateValue(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const time = Date.parse(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(time) ? undefined : time;
}

/** Ids sent per request when rows are read by id: a URL stays short. */
const IDS_PER_REQUEST = 100;

/** `ids` cut into the batches a request by id takes. */
export function idBatches(ids: readonly string[]): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += IDS_PER_REQUEST)
    batches.push(ids.slice(i, i + IDS_PER_REQUEST));
  return batches;
}
