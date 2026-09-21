import type { ReactNode } from "react";

/** Part d'un effectif, affichée dans sa propre pastille. */
export interface SummaryPart {
  key: string;
  count: number;
  /** Classes de fond et d'encre, par tokens. */
  box: string;
  /** Libellé complet, pluriel compris : infobulle et lecteurs d'écran. */
  label: string;
}

/**
 * Résumé d'un onglet : son effectif, et sa répartition quand elle a un sens (les
 * alertes par gravité). Les parts vides ne sont pas affichées.
 */
export interface RelatedSummary {
  count: number | undefined;
  parts?: SummaryPart[];
}

/**
 * Un type de données rattachées à un objet (node, service…), présenté dans un onglet
 * de son panneau de détail. Chaque objet en déclare la liste, dans l'ordre d'affichage.
 */
export interface RelatedTab {
  key: string;
  labelKey: string;
  icon: ReactNode;
  /** Hook appelé par le compteur de l'onglet, un composant par onglet. */
  useSummary: (id: string | undefined) => RelatedSummary;
  render: (id: string, locale: string) => ReactNode;
}

/** Clé de l'onglet des propriétés : absente de l'URL, c'est l'onglet par défaut. */
export const PROPERTIES_TAB = "properties";
