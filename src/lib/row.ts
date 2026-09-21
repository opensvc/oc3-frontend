/**
 * Reading a prop by name from an API row.
 *
 * Rows are flat objects whose keys are the collector props. TypeScript cannot index
 * them by an arbitrary string, hence this conversion, kept here rather than repeated.
 */
export function readProp<T>(row: T, prop: string): unknown {
  return (row as Record<string, unknown>)[prop];
}

/** The same read, reduced to an editable string. */
export function readPropAsString<T>(row: T, prop: string): string {
  const value = readProp(row, prop);
  return value === undefined || value === null ? "" : String(value);
}
