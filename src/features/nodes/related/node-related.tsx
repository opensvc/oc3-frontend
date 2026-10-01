import { useTranslation } from "react-i18next";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { SEVERITY_LEVELS, severityLevel } from "@/components/opensvc/severity";
import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import { NodeAlerts } from "./NodeAlerts";
import { NodeInventory } from "./NodeInventory";
import { NodeLogs } from "./NodeLogs";
import { NodeSysreport } from "./NodeSysreport";
import { useNodeAlerts, useNodeLogs, useNodeSysreport } from "./queries";
import { periodBegin } from "./sysreport-period";

/**
 * Data attached to a node, one tab each, in display order.
 *
 * Adding a kind of data — addresses, services, tags, checks… — amounts to writing
 * its component and adding it here. The summary reuses the component's query:
 * opening the tab reloads nothing. What the agent inventories — hardware, network
 * addresses, storage, packages — shares the Inventory tab, one category at a time.
 */
export const NODE_RELATED_TABS: RelatedTab[] = [
  {
    key: "inventory",
    labelKey: "nodes.related.inventory",
    icon: <ColumnFamilyIcon family="cpu" />,
    // No count of its own: each category of the tab carries its count on its chip.
    useSummary: () => ({ count: undefined }),
    render: (nodeId, locale) => <NodeInventory nodeId={nodeId} locale={locale} />,
  },
  {
    key: "sysreport",
    labelKey: "nodes.related.sysreport",
    icon: <ColumnFamilyIcon family="time" />,
    // The changes of the last seven days: whether the node moved lately.
    useSummary: (nodeId) => ({
      count: useNodeSysreport(nodeId, { path: "", begin: periodBegin("week"), limit: 1 }).data
        ?.total,
    }),
    render: (nodeId, locale) => <NodeSysreport nodeId={nodeId} locale={locale} />,
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
  {
    key: "logs",
    labelKey: "nodes.related.logs",
    icon: <ColumnFamilyIcon family="time" />,
    // All the entries of the node, not only those the tab shows.
    useSummary: (nodeId) => {
      const page = useNodeLogs(nodeId).data;
      return { count: page === undefined ? undefined : (page.total ?? page.rows.length) };
    },
    render: (nodeId, locale) => <NodeLogs nodeId={nodeId} locale={locale} />,
  },
];
