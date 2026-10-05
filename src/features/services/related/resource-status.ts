import { statusBadge } from "@/components/opensvc/status";
import type { ServiceResource } from "./queries";

/**
 * The shares of a resource list for a tab counter: down, in warning and the
 * others, which add up to the count.
 */
export function resourceStatusSummary(
  rows: ServiceResource[] | undefined,
  t: (key: string, options: { count: number }) => string,
) {
  const count = (state: string) =>
    (rows ?? []).filter((row) => statusBadge(row.res_status).state === state).length;
  const down = count("down");
  const warn = count("warn");
  const other = (rows?.length ?? 0) - down - warn;
  return {
    count: rows?.length,
    parts: [
      {
        key: "down",
        count: down,
        box: "bg-state-down-soft text-state-down",
        label: t("services.resources.downCount", { count: down }),
      },
      {
        key: "warn",
        count: warn,
        box: "bg-state-warn-soft text-state-warn",
        label: t("services.resources.warnCount", { count: warn }),
      },
      {
        key: "other",
        count: other,
        box: "bg-surface-sunken text-ink-muted",
        label: t("services.resources.otherCount", { count: other }),
      },
    ],
  };
}
