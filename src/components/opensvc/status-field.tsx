import type { DetailField } from "./DetailPanel";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { statusBadge } from "./status";

/**
 * A status attribute of a detail panel (up, down, warn, n/a, the standby states),
 * shown with the badge the lists use: the same shape, colour and word for a value
 * wherever it appears. `format` keeps the raw value, which decides whether the
 * attribute is shown.
 */
export function statusField<T>(prop: string, value: (row: T) => unknown): DetailField<T> {
  const text = (row: T) => {
    const v = value(row);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  return {
    prop,
    format: text,
    render: (row) => <StatusBadge {...statusBadge(text(row))} />,
  };
}

/** An alert severity attribute, with the badge of the dashboard. */
export function severityField<T>(prop: string, value: (row: T) => unknown): DetailField<T> {
  return {
    prop,
    format: (row) => {
      const v = value(row);
      return typeof v === "number" ? String(v) : undefined;
    },
    render: (row) => {
      const v = value(row);
      return <SeverityBadge severity={typeof v === "number" ? v : 0} />;
    },
  };
}
