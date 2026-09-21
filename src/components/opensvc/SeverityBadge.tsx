import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { severityLevel } from "./severity";

/** Sévérité d'une entrée du dashboard : chiffre brut, palier de lecture (`severity.ts`). */
export function SeverityBadge({ severity, className }: { severity: number; className?: string }) {
  const { t } = useTranslation();
  const level = severityLevel(severity);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-(--radius-control) px-1.5 text-data leading-5 font-medium",
        level.box,
        className,
      )}
      title={t(`dashboard.severity.${level.key}`)}
    >
      <span aria-hidden="true" className="text-[0.625rem]">
        {level.glyph}
      </span>
      <span className="sr-only">{t(`dashboard.severity.${level.key}`)}</span>
      {severity}
    </span>
  );
}
