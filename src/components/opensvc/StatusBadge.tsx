import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type ObjectState = "up" | "warn" | "down" | "unknown";

const styles: Record<ObjectState, { ink: string; glyph: string }> = {
  up: { ink: "text-state-up", glyph: "●" },
  warn: { ink: "text-state-warn", glyph: "▲" },
  down: { ink: "text-state-down", glyph: "■" },
  unknown: { ink: "text-state-unknown", glyph: "○" },
};

/**
 * État d'un objet OpenSVC : une forme, une teinte et un libellé, sans fond coloré.
 * La forme distingue les états sans la couleur, pour rester lisible en cas de
 * daltonisme ou d'impression en niveaux de gris.
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
        "inline-flex w-[6.5rem] items-center gap-1 text-data leading-5 font-medium whitespace-nowrap",
        s.ink,
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
