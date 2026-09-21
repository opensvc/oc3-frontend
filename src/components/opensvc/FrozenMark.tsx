import { useTranslation } from "react-i18next";
import { SnowflakeIcon } from "@/components/ui/icons";

/**
 * Marque de gel en tête de ligne.
 *
 * Le gel se lit quelles que soient les colonnes affichées : il dit que l'objet ne
 * répond plus aux ordres d'orchestration, ce qui explique bien des états. Le flocon
 * est doublé d'un texte pour les lecteurs d'écran et d'une infobulle, la couleur et
 * la forme seules ne suffisant pas.
 */
export function FrozenMark({ frozen }: { frozen: boolean }) {
  const { t } = useTranslation();
  if (!frozen) return null;
  return (
    <span title={t("state.frozen")} className="text-icon-network">
      <SnowflakeIcon className="h-3.5 w-3.5" />
      <span className="sr-only">{t("state.frozen")}</span>
    </span>
  );
}
