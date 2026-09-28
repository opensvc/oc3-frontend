import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { ServicePackagesDiff } from "./ServicePackagesDiff";
import { ServiceStorage } from "./ServiceStorage";
import { useServiceDisks, useServicePackagesDiff } from "./queries";

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
    key: "pkgdiff",
    labelKey: "services.related.pkgdiff",
    icon: <ColumnFamilyIcon family="package" />,
    // The packages that differ between the nodes running the service; none when
    // it runs on a single node.
    useSummary: (svcId) => {
      const diff = useServicePackagesDiff(svcId, false).data;
      return {
        count:
          diff === undefined
            ? undefined
            : diff === null
              ? 0
              : new Set(diff.data.map((r) => `${r.pkg_name}\u0000${r.pkg_arch}\u0000${r.pkg_type}`))
                  .size,
      };
    },
    render: (svcId) => <ServicePackagesDiff svcId={svcId} />,
  },
];
