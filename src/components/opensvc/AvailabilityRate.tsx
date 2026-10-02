import { useTranslation } from "react-i18next";
import { formatPercent } from "@/lib/format";

/**
 * An availability rate, flagged when it falls below the SLA of the object: in
 * red, with a mark and a tooltip saying so, not by the colour alone. Without SLA,
 * or above it, the plain percent.
 */
export function AvailabilityRate({
  rate,
  sla,
  locale,
}: {
  rate: number;
  sla: number | null | undefined;
  locale: string;
}) {
  const { t } = useTranslation();
  const below = typeof sla === "number" && rate < sla;
  if (!below) return <>{formatPercent(rate, locale)}</>;
  const title = t("services.belowSla", { sla: formatPercent(sla, locale, 3) });
  return (
    <span title={title} className="inline-flex items-center gap-1 font-medium text-state-down">
      <span aria-hidden="true" className="text-[0.625rem]">
        ▼
      </span>
      {formatPercent(rate, locale)}
      <span className="sr-only">{title}</span>
    </span>
  );
}
