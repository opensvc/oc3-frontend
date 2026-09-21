/**
 * Tables a filter may bear on, in the order of `filterTables`
 * (`server/handlers/post_filters.go` on the oc3 side). The list is validated there on
 * creation as on update; repeating it here allows offering it as a list rather than
 * as free input. A drift from oc3 would show as an explicit refusal from the server.
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

/** Accepted operators, as in the `f_op` enum of the OpenAPI schema. */
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
