/**
 * Tables sur lesquelles un filtre peut porter, dans l'ordre de `filterTables`
 * (`server/handlers/post_filters.go` côté oc3). La liste y est validée à la création
 * comme à la modification ; la reprendre ici permet de la proposer en liste plutôt
 * qu'en saisie libre. Un écart avec oc3 se traduirait par un refus explicite du serveur.
 */
export const FILTER_TABLES = [
  "nodes",
  "node_ip",
  "services",
  "svcmon",
  "resmon",
  "apps",
  "node_hba",
  "diskinfo",
  "svcdisks",
  "v_comp_moduleset_attachments",
  "v_tags",
  "packages",
] as const;

/** Opérateurs acceptés, tels que l'enum `f_op` du schéma OpenAPI. */
export const FILTER_OPERATORS = ["=", "LIKE", ">", ">=", "<", "<=", "IN"] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export function isFilterOperator(value: string | undefined): value is FilterOperator {
  return FILTER_OPERATORS.some((op) => op === value);
}

export interface FilterDefinition {
  f_table: string;
  f_field: string;
  f_op: FilterOperator;
  f_value: string;
}
