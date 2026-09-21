import { useId } from "react";

/** Attributes of the panel bound to the active tab. */
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
