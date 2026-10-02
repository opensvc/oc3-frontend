import { useTranslation } from "react-i18next";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { useClusterNodes } from "./use-cluster-nodes";

/**
 * The nodes of a cluster's configuration, one badge each, which opens the node's
 * record. A node the user may not see, or that the collector does not know, keeps
 * its name in a plain badge, saying why.
 */
export function ClusterNodes({
  clusterId,
  names,
}: {
  clusterId: string | undefined;
  names: string | undefined;
}) {
  const { t } = useTranslation();
  const ids = useClusterNodes(clusterId);
  const list = (names ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  if (list.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((name) => {
        const id = ids.data?.get(name);
        return id === undefined ? (
          <span
            key={name}
            title={ids.isPending ? undefined : t("clusters.nodeUnknown")}
            className="inline-flex items-center rounded-full border border-dashed border-line px-1.5 text-data text-ink-muted"
          >
            {name}
          </span>
        ) : (
          <CrossLink key={name} kind="node" id={id}>
            {name}
          </CrossLink>
        );
      })}
    </span>
  );
}
