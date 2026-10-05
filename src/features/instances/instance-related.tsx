import { useTranslation } from "react-i18next";
import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { resourceStatusSummary } from "@/features/services/related/resource-status";
import { InstanceResources } from "./InstanceResources";
import { useInstanceResources } from "./use-instance-resources";

/** Data attached to an instance, one tab each, on the model of the service. */
export const INSTANCE_RELATED_TABS: RelatedTab[] = [
  {
    key: "resources",
    labelKey: "services.related.resources",
    icon: <ColumnFamilyIcon family="resource" />,
    useSummary: (instanceId) => {
      const { t } = useTranslation();
      return resourceStatusSummary(useInstanceResources(instanceId).data, t);
    },
    render: (instanceId, locale) => <InstanceResources instanceId={instanceId} locale={locale} />,
  },
];
