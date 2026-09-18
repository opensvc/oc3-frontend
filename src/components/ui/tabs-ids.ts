import { useId } from "react";

/** Attributs du panneau associé à l'onglet actif. */
export function tabPanelProps(idPrefix: string, key: string) {
  return {
    id: `${idPrefix}-panel-${key}`,
    role: "tabpanel" as const,
    "aria-labelledby": `${idPrefix}-tab-${key}`,
    tabIndex: 0,
  };
}

/** Identifiant stable pour relier une barre d'onglets et ses panneaux. */
export function useTabsId(): string {
  return useId().replace(/:/g, "");
}
