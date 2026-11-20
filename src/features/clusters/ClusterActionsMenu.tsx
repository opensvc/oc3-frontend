import { useQueryClient } from "@tanstack/react-query";
import {
  ActionsMenu,
  type ActionEntry,
  type ActionTarget,
  type DataActionEntry,
} from "@/components/opensvc/ActionsMenu";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

/**
 * Agent actions of a whole cluster: the three cluster-wide actions of om3 (`om
 * cluster freeze`, `unfreeze` and `abort`), which the collector queues for a live
 * node of the cluster running om3, which runs them on every node (`om node <action>
 * --node *`), and the upgrade of the agents (`om cluster update pkg`), which
 * upgrades the opensvc packages of every node, one node at a time. Entries left
 * without submenu, which would only add a click: freeze and thaw, then, apart,
 * abort, which stops the running orchestration, and the upgrade. The other cluster
 * commands of om3 (join, leave, enroll, evict, register, ssh trust) need arguments
 * or a local session and are not offered.
 */
const CLUSTER_ACTIONS: readonly ActionEntry[] = [
  { action: "freeze" },
  { action: "thaw" },
  { action: "abort", separatorBefore: true },
  { action: "updatepkg", separatorBefore: true },
];

/**
 * The cluster actions, and the deletion of the clusters from the collector, with
 * their nodes and services. `onDeleted` receives the ids of the clusters deleted.
 */
export function ClusterActionsMenu({
  clusters,
  onDeleted,
}: {
  clusters: ActionTarget[];
  onDeleted?: (ids: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const dataActions: DataActionEntry[] = [
    {
      key: "delete",
      // NodeManager, as the deletion of a node; the API also requires the
      // responsibility of every node and service of the cluster. One request per
      // cluster, so that a refusal names its cluster.
      privileges: ["NodeManager"],
      run: async (target) => {
        const { error } = await api.DELETE("/clusters/{cluster_id}", {
          params: { path: { cluster_id: target.id } },
        });
        return error === undefined ? null : problemText(error);
      },
      onDone: (done) => {
        if (done.length === 0) return;
        // The nodes and services went with the clusters.
        for (const key of ["clusters", "nodes", "services"])
          void queryClient.invalidateQueries({ queryKey: [key] });
        onDeleted?.(done.map((target) => target.id));
      },
    },
  ];
  return (
    <ActionsMenu
      targets={clusters}
      actions={CLUSTER_ACTIONS}
      dataActions={dataActions}
      prefix="clusters.actions"
      // `cluster_id` alone targets the whole cluster.
      enqueue={(target, action) => ({ cluster_id: target.id, action })}
    />
  );
}
