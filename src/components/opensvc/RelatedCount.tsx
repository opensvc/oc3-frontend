import { useTranslation } from "react-i18next";
import type { RelatedTab } from "./related-tabs";

const PILL =
  "inline-flex min-w-5 items-center justify-center gap-0.5 rounded-full px-1.5 text-[0.6875rem] leading-4 tabular-nums";

/**
 * Compteur d'un onglet de données rattachées. Composant à part pour que le hook de
 * résumé de chaque onglet soit appelé à sa place. Un compteur nul reste affiché,
 * estompé : les onglets ne changent pas de place d'un objet à l'autre.
 *
 * Quand le résumé est réparti (les alertes par gravité), la pastille se découpe en
 * sections, une par part non vide, teintée selon sa catégorie. Seuls les nombres
 * sont affichés, à la demande : écart assumé à la règle « jamais la couleur seule »,
 * compensé par l'ordre fixe des sections (de la plus grave à la moins grave) et par
 * les libellés complets en infobulle et pour les lecteurs d'écran (voir notes.md).
 */
export function RelatedCount({ tab, id }: { tab: RelatedTab; id: string | undefined }) {
  const { t } = useTranslation();
  const { count, parts = [] } = tab.useSummary(id);
  if (count === undefined) return null;
  const shown = parts.filter((part) => part.count > 0);
  if (count === 0 || shown.length === 0) {
    return (
      <span
        title={t("related.count", { count })}
        className={`${PILL} ${count === 0 ? "bg-surface text-ink-muted/60" : "bg-surface-sunken text-ink-muted"}`}
      >
        {count}
      </span>
    );
  }
  return (
    <span
      title={shown.map((part) => part.label).join(", ")}
      className="inline-flex items-stretch overflow-hidden rounded-full text-[0.6875rem] leading-4 tabular-nums"
    >
      {shown.map((part) => (
        <span
          key={part.key}
          className={`inline-flex items-center px-1.5 first:pl-2 last:pr-2 ${part.box}`}
        >
          <span aria-hidden="true">{part.count}</span>
          <span className="sr-only">{part.label}</span>
        </span>
      ))}
    </span>
  );
}
