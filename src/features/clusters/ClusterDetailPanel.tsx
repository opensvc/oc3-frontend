import { useTranslation } from "react-i18next";
import { DetailPanel } from "@/components/opensvc/DetailPanel";
import { CLUSTER_GROUPS } from "./cluster-groups";
import { useCluster } from "./use-cluster";

/**
 * A cluster: its identity, the nodes and services of the collector that name it,
 * each count a link to their list filtered on it, and the state its daemon last
 * pushed. Nothing is edited here.
 */
export function ClusterDetailPanel({
  clusterId,
  label,
  onClose,
}: {
  clusterId: string | undefined;
  label: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: cluster, isPending, isError, error } = useCluster(clusterId);
  const title = cluster?.cluster_name ?? (label === "" ? t("clusters.detail.title") : label);

  return (
    <DetailPanel
      kind="cluster"
      recordId={clusterId}
      open={clusterId !== undefined}
      title={title}
      onClose={onClose}
      groups={CLUSTER_GROUPS}
      row={cluster}
      labelPrefix="clusters.fields"
      groupPrefix="clusters.detail.groups"
      isPending={isPending}
      errorMessage={isError ? error.message : null}
      editHint=""
    />
  );
}
