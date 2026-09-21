import { useTranslation } from "react-i18next";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { SEVERITY_LEVELS, severityLevel } from "@/components/opensvc/severity";
import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import { NodeAlerts } from "./NodeAlerts";
import { NodeHardware } from "./NodeHardware";
import { NodeNetworks } from "./NodeNetworks";
import { NodeStorage } from "./NodeStorage";
import { useNodeAlerts, useNodeDisks, useNodeHardware, useNodeIps } from "./queries";

/**
 * Data attached to a node, one tab each, in display order.
 *
 * Adding a kind of data — disks, addresses, services, tags, checks… — amounts to
 * writing its component and adding it here. The summary reuses the component's
 * query: opening the tab reloads nothing.
 */
export const NODE_RELATED_TABS: RelatedTab[] = [
  {
    key: "hardware",
    labelKey: "nodes.related.hardware",
    icon: <ColumnFamilyIcon family="cpu" />,
    useSummary: (nodeId) => ({ count: useNodeHardware(nodeId).data?.length }),
    render: (nodeId, locale) => <NodeHardware nodeId={nodeId} locale={locale} />,
  },
  {
    key: "networks",
    labelKey: "nodes.related.networks",
    icon: <ColumnFamilyIcon family="network" />,
    useSummary: (nodeId) => ({ count: useNodeIps(nodeId).data?.length }),
    render: (nodeId) => <NodeNetworks nodeId={nodeId} />,
  },
  {
    key: "storage",
    labelKey: "nodes.related.storage",
    icon: <ColumnFamilyIcon family="disk" />,
    useSummary: (nodeId) => ({ count: useNodeDisks(nodeId).data?.length }),
    render: (nodeId, locale) => <NodeStorage nodeId={nodeId} locale={locale} />,
  },
  {
    key: "alerts",
    labelKey: "nodes.related.alerts",
    icon: <ColumnFamilyIcon family="alert" />,
    useSummary: (nodeId) => {
      const { t } = useTranslation();
      const rows = useNodeAlerts(nodeId).data;
      return {
        count: rows?.length,
        parts: SEVERITY_LEVELS.map((level) => {
          const count = (rows ?? []).filter(
            (row) => severityLevel(row.dash_severity ?? 0).key === level.key,
          ).length;
          return {
            key: level.key,
            count,
            box: level.box,
            label: t(`dashboard.severityCount.${level.key}`, { count }),
          };
        }),
      };
    },
    render: (nodeId, locale) => <NodeAlerts nodeId={nodeId} locale={locale} />,
  },
];
