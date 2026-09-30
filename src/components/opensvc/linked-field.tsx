import { CrossLink, type CrossKind } from "./CrossLink";
import type { DetailField } from "./DetailPanel";

/**
 * Attribute whose value names an object from another view: shown as a badge, which
 * displays its record on a click as in the lists.
 */
export function linkedField<T>(
  prop: string,
  kind: CrossKind,
  idOf: (row: T) => string | undefined,
  format: (row: T, locale: string) => string | undefined,
): DetailField<T> {
  return {
    prop,
    format,
    render: (row, locale) => (
      <CrossLink kind={kind} id={idOf(row)}>
        {format(row, locale)}
      </CrossLink>
    ),
  };
}
