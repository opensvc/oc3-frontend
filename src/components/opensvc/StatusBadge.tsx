import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type ObjectState = "up" | "warn" | "down" | "unknown";

const styles: Record<ObjectState, { box: string; glyph: string }> = {
  up: { box: "bg-state-up-soft text-state-up", glyph: "●" },
  warn: { box: "bg-state-warn-soft text-state-warn", glyph: "▲" },
  down: { box: "bg-state-down-soft text-state-down", glyph: "■" },
  unknown: { box: "bg-state-unknown-soft text-state-unknown", glyph: "○" },
};

/**
 * Badge d'état d'un objet OpenSVC. Chaque état a une forme distincte en plus de sa couleur,
 * pour rester lisible en cas de daltonisme ou d'impression en niveaux de gris.
 *
 * Largeur fixe, taillée pour le libellé le plus long (« stdby down ») : dans une
 * colonne, les badges s'alignent en un bloc régulier, glyphes compris, quel que soit
 * l'état. `label` remplace le libellé de l'état quand la valeur de l'agent est plus
 * précise, comme « stdby up » affiché avec la forme de « up ».
 */
export function StatusBadge({
  state,
  label,
  className,
}: {
  state: ObjectState;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const s = styles[state];
  return (
    <span
      className={cn(
        "inline-flex w-[6.5rem] items-center gap-1 rounded-(--radius-control) px-1.5 text-data leading-5 font-medium whitespace-nowrap",
        s.box,
        className,
      )}
    >
      <span aria-hidden="true" className="text-[0.625rem]">
        {s.glyph}
      </span>
      {label ?? t(`state.${state}`)}
    </span>
  );
}
