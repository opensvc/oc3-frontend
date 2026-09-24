import { createElement } from "react";
import type { ColumnFilterOption } from "./CollectorList";
import { StatusBadge } from "./StatusBadge";
import { statusBadge } from "./status";

/**
 * Values of a collector status, standby states included, in the order of the
 * historical collector's status filters. Each is shown with the badge the cells use.
 */
export const STATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  "up",
  "warn",
  "down",
  "stdby up",
  "stdby down",
  "n/a",
  "undef",
].map((value) => ({ value, render: createElement(StatusBadge, statusBadge(value)) }));

/**
 * Frozen state, whose stored values differ from one table to the next: `T`/`F` for
 * nodes, `1`/`0` for instances, `frozen`/`unfrozen`/`mixed` for services.
 */
export function frozenFilterOptions(
  frozen: string,
  thawed: string,
  mixed?: string,
): ColumnFilterOption[] {
  const options: ColumnFilterOption[] = [
    { value: frozen, labelKey: "state.frozen" },
    { value: thawed, labelKey: "state.thawed" },
  ];
  if (mixed !== undefined) options.push({ value: mixed, labelKey: "state.frozenMixed" });
  return options;
}
