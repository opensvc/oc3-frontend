import type { ReactNode } from "react";

/** Résumé d'un onglet : son effectif, et une gravité quand elle a un sens. */
export interface RelatedSummary {
  count: number | undefined;
  /** Palier de gravité pour teinter le compteur : 0 neutre, 2 avertissement, 3 critique. */
  severity?: number;
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
