import { NODE_PROPS } from "@/features/nodes/node-props";
import {
  assetDifferences,
  attachmentDifferences,
  moduleDifferences,
  packageDifferences,
} from "./nodes-diff";
import {
  useNodesAssets,
  useNodesCompliance,
  useServiceNodeIds,
  useServicePackagesDiff,
} from "./queries";

/**
 * Total number of differences between the nodes of a service, for the counter of
 * the Nodes Differences tab: the sum of its categories, read through the same
 * queries as the tab, which then opens without reloading anything. Undefined while
 * a category loads or when one cannot be read, and when the service runs on fewer
 * than two nodes, which leaves nothing to compare.
 */
export function useNodesDiffCount(svcId: string | undefined): number | undefined {
  const nodeIds = useServiceNodeIds(svcId);
  const assets = useNodesAssets(nodeIds.data);
  const packages = useServicePackagesDiff(svcId, false);
  const compliance = useNodesCompliance(nodeIds.data);

  if (nodeIds.data === undefined || nodeIds.data.length < 2) return undefined;
  if (assets.data === undefined || packages.data === undefined || compliance.data === undefined)
    return undefined;
  return (
    assetDifferences(assets.data, NODE_PROPS).length +
    (packages.data === null ? 0 : packageDifferences(packages.data).length) +
    moduleDifferences(compliance.data).length +
    attachmentDifferences(compliance.data, (n) => n.modulesets.map((m) => m.modset_name)).length +
    attachmentDifferences(compliance.data, (n) => n.rulesets.map((r) => r.ruleset_name)).length
  );
}
