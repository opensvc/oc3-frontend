export type Period = "day" | "week" | "month" | "all";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The date a period of the sysreport history starts at, as the API takes it.
 * Rounded to the hour or to the day, so that the same period asks for the same
 * list from one render to the next.
 */
export function periodBegin(period: Period, now = new Date()): string | undefined {
  if (period === "all") return undefined;
  const days = period === "day" ? 1 : period === "week" ? 7 : 30;
  const begin = new Date(now.getTime() - days * DAY_MS);
  if (period === "day") begin.setMinutes(0, 0, 0);
  else begin.setHours(0, 0, 0, 0);
  return `${begin.toISOString().slice(0, 19)}Z`;
}
