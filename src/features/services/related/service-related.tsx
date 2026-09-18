import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { ServiceStorage } from "./ServiceStorage";
import { useServiceDisks } from "./queries";

/**
 * Données rattachées à un service, un onglet chacune, sur le modèle du node
 * (`NODE_RELATED_TABS`). Ajouter instances, ressources, alertes ou tags revient à
 * écrire le composant et à l'ajouter ici.
 */
export const SERVICE_RELATED_TABS: RelatedTab[] = [
  {
    key: "storage",
    labelKey: "services.related.storage",
    icon: <ColumnFamilyIcon family="disk" />,
    // Comme pour le node, l'effectif est celui des disques, l'essentiel de l'onglet.
    useSummary: (svcId) => ({ count: useServiceDisks(svcId).data?.length }),
    render: (svcId, locale) => <ServiceStorage svcId={svcId} locale={locale} />,
  },
];
