import { useTranslation } from "react-i18next";
import type { RelatedTab } from "./related-tabs";

const TONES = [
  { min: 3, box: "bg-state-down-soft text-state-down", glyph: "■" },
  { min: 2, box: "bg-state-warn-soft text-state-warn", glyph: "▲" },
] as const;

/**
 * Compteur d'un onglet de données rattachées. Composant à part pour que le hook de
 * résumé de chaque onglet soit appelé à sa place. Un compteur nul reste affiché,
 * estompé : les onglets ne changent pas de place d'un objet à l'autre. Une gravité
 * teinte le compteur, avec la forme du palier pour ne pas reposer sur la couleur.
 */
export function RelatedCount({ tab, id }: { tab: RelatedTab; id: string | undefined }) {
  const { t } = useTranslation();
  const { count, severity = 0 } = tab.useSummary(id);
  if (count === undefined) return null;
  const tone = count > 0 ? TONES.find((level) => severity >= level.min) : undefined;
  return (
    <span
      title={t("related.count", { count })}
      className={`inline-flex min-w-5 items-center justify-center gap-0.5 rounded-full px-1.5 text-[0.6875rem] leading-4 tabular-nums ${
        tone?.box ??
        (count === 0 ? "bg-surface text-ink-muted/60" : "bg-surface-sunken text-ink-muted")
      }`}
    >
      {tone !== undefined && <span aria-hidden="true">{tone.glyph}</span>}
      {count}
    </span>
  );
}
