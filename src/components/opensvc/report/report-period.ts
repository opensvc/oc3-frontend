/** Days of history the charts of a report may show, the choices of its toolbar. */
export const REPORT_PERIODS = [30, 90, 365] as const;

/** Days of history shown when none is chosen. */
export const DEFAULT_REPORT_DAYS = 90;

/** A period of the URL, if it is one of the choices; the default otherwise. */
export function reportDays(value: unknown): number {
  const days = typeof value === "number" ? value : Number(value);
  return (REPORT_PERIODS as readonly number[]).includes(days) ? days : DEFAULT_REPORT_DAYS;
}
