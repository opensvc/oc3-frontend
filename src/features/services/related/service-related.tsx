import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { useTranslation } from "react-i18next";
import { statusBadge } from "@/components/opensvc/status";
import { ServiceNodesDiff } from "./ServiceNodesDiff";
import { ServiceResources } from "./ServiceResources";
import { ServiceStorage } from "./ServiceStorage";
import { useServiceDisks, useServiceResources } from "./queries";
import { useNodesDiffSummary } from "./use-nodes-diff-summary";

/**
 * Data attached to a service, one tab each, on the model of the node
 * (`NODE_RELATED_TABS`). Adding instances, alerts or tags amounts to
 * writing the component and adding it here.
 */
export const SERVICE_RELATED_TABS: RelatedTab[] = [
  {
    key: "resources",
    labelKey: "services.related.resources",
    icon: <ColumnFamilyIcon family="resource" />,
    // The resources split into those down, in warning, and the others: the shares
    // add up to the count, and the first two are what the tab is opened for.
    useSummary: (svcId) => {
      const { t } = useTranslation();
      const rows = useServiceResources(svcId).data;
      const count = (state: string) =>
        (rows ?? []).filter((row) => statusBadge(row.res_status).state === state).length;
      return {
        count: rows?.length,
        parts: [
          {
            key: "down",
            count: count("down"),
            box: "bg-state-down-soft text-state-down",
            label: t("services.resources.downCount", { count: count("down") }),
          },
          {
            key: "warn",
            count: count("warn"),
            box: "bg-state-warn-soft text-state-warn",
            label: t("services.resources.warnCount", { count: count("warn") }),
          },
          {
            // The others, so that the shares add up to the count.
            key: "other",
            count: (rows?.length ?? 0) - count("down") - count("warn"),
            box: "bg-surface-sunken text-ink-muted",
            label: t("services.resources.otherCount", {
              count: (rows?.length ?? 0) - count("down") - count("warn"),
            }),
          },
        ],
      };
    },
    render: (svcId, locale) => <ServiceResources svcId={svcId} locale={locale} />,
  },
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
    // The total of its categories, "n/a" on a single node. It reads the assets, the
    // packages and the compliance of every node when the panel opens; the tab then
    // reuses them.
    useSummary: (svcId) => useNodesDiffSummary(svcId),
    render: (svcId) => <ServiceNodesDiff svcId={svcId} />,
  },
];
