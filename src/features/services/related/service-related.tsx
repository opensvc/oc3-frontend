import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { ServiceStorage } from "./ServiceStorage";
import { useServiceDisks } from "./queries";

/**
 * Data attached to a service, one tab each, on the model of the node
 * (`NODE_RELATED_TABS`). Adding instances, resources, alerts or tags amounts to
 * writing the component and adding it here.
 */
export const SERVICE_RELATED_TABS: RelatedTab[] = [
  {
    key: "storage",
    labelKey: "services.related.storage",
    icon: <ColumnFamilyIcon family="disk" />,
    // As for the node, the count is that of the disks, the bulk of the tab.
    useSummary: (svcId) => ({ count: useServiceDisks(svcId).data?.length }),
    render: (svcId, locale) => <ServiceStorage svcId={svcId} locale={locale} />,
  },
];
