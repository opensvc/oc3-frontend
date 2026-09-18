import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Sévérité d'une entrée du dashboard. Le collector la stocke en entier de 0 à 5
 * sans libellé : on garde donc le chiffre affiché, et on n'ajoute qu'un palier de
 * lecture. Comme pour les états d'objet, chaque palier a sa forme propre, pour
 * rester lisible sans la couleur.
 */
const levels = [
  { min: 3, box: "bg-state-down-soft text-state-down", glyph: "■", key: "critical" },
  { min: 2, box: "bg-state-warn-soft text-state-warn", glyph: "▲", key: "warning" },
  { min: 0, box: "bg-state-unknown-soft text-state-unknown", glyph: "○", key: "info" },
] as const;

export function SeverityBadge({ severity, className }: { severity: number; className?: string }) {
  const { t } = useTranslation();
  const level = levels.find((candidate) => severity >= candidate.min) ?? levels[2];
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
