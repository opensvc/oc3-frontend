import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { ServiceNodesDiff } from "./ServiceNodesDiff";
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
  {
    key: "nodediff",
    labelKey: "services.related.nodediff",
    icon: <ColumnFamilyIcon family="node" />,
    // No count: it would read the assets and the compliance of every node whenever
    // the panel opens, for a tab that is a report rather than a list.
    useSummary: () => ({ count: undefined }),
    render: (svcId) => <ServiceNodesDiff svcId={svcId} />,
  },
];
