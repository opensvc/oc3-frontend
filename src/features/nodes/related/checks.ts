import type { components } from "@/lib/api/schema";

type CheckRow = components["schemas"]["CheckRow"];

/** Whether the check is out of its thresholds: under the low one, over the high one. */
export function isOutOfBounds(row: CheckRow): boolean {
  return row.chk_err === 1 || row.chk_err === 2;
}
