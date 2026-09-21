import { CrossLink, type CrossKind } from "./CrossLink";
import type { DetailField } from "./DetailPanel";

/**
 * Attribut dont la valeur désigne un objet d'une autre vue : affiché en puce, qui
 * montre sa fiche au double-clic comme dans les listes.
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
