import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ActionsMenu,
  type ActionEntry,
  type ActionTarget,
  type DataActionEntry,
} from "@/components/opensvc/ActionsMenu";
import { objectDataActions } from "@/components/opensvc/object-data-actions";
import { inBatches } from "@/lib/api/batch";
import { api } from "@/lib/api/client";

/**
 * Agent actions of a node, the "node agent" entries of the historical collector
 * (`am_node_agent_leafs`), in one submenu per kind of effect and from the harmless
 * to the disruptive: what refreshes the collector's data and changes nothing on the
 * node; compliance; orchestration, where services may run; maintenance of the agent
 * and of the node's view of its storage; then, apart, the reboot and the shutdown.
 * Within a submenu the reversible entries come first. The wake starts a node down:
 * the collector queues it on a live peer of its cluster, which starts the virtual
 * machine through its hypervisor or sends Wake-on-LAN packets to a physical node.
 * The provisioning from a template and the root password rotation are not
 * offered, as the API does not accept them.
 *
 * Each action is explained, as in the node actions menu of the om3 webapp: its
 * icon, what it does, the ones that stop the services of the node red and badged
 * (see ActionsMenu).
 */
export const ACTIONS: readonly ActionEntry[] = [
  { action: "pushasset", group: "refresh" },
  { action: "checks", group: "refresh" },
  { action: "sysreport", group: "refresh" },
  { action: "pushdisks", group: "refresh" },
  { action: "pushpkg", group: "refresh" },
  { action: "pushpatch", group: "refresh" },
  { action: "pushstats", group: "refresh" },
  { action: "compliance_check", group: "compliance" },
  { action: "compliance_fix", group: "compliance" },
  { action: "updatecomp", group: "compliance" },
  { action: "freeze", group: "orchestration" },
  { action: "thaw", group: "orchestration" },
  { action: "drain", group: "orchestration", separatorBefore: true },
  { action: "updatepkg", group: "maintenance" },
  { action: "scanscsi", group: "maintenance" },
  { action: "wake", group: "power" },
  { action: "schedule_reboot", group: "power", separatorBefore: true },
  { action: "unschedule_reboot", group: "power" },
  { action: "reboot", group: "power", separatorBefore: true },
  { action: "shutdown", group: "power" },
];

/**
 * The agent actions, then the data actions of the historical collector ("Data
 * actions › On nodes"): notifications, tags and compliance attachments (see
 * objectDataActions), then, last, the deletion of the node from the collector,
 * offered to NodeManager as the API requires, which also checks the responsibility
 * for each node. `onDeleted` receives the ids of the nodes deleted.
 */
export function NodeActionsMenu({
  nodes,
  onDeleted,
  onCompare,
  onTopology,
}: {
  nodes: ActionTarget[];
  /** Opens the comparison of the selection, see ActionsMenu. */
  onCompare?: () => void;
  /** Opens the topology of the selection, see ActionsMenu. */
  onTopology?: () => void;
  onDeleted?: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // A batch answer as the report wants it: the objects done, and why the others failed.
  const report = (results: { item: ActionTarget; ok: boolean; message: string }[]) => ({
    done: results.flatMap((r) => (r.ok ? [r.item] : [])),
    failures: results.flatMap((r) =>
      r.ok ? [] : [t("nodes.actions.failure", { name: r.item.name, message: r.message })],
    ),
  });
  const dataActions: DataActionEntry[] = [
    ...objectDataActions("node", queryClient),
    {
      key: "delete",
      separatorBefore: true,
      privileges: ["NodeManager"],
      // Cascades on the collector side: instances, alerts, checks, packages, tags
      // and the other records of the node go with it. By batches: one request per
      // few hundred nodes.
      runAll: async (targets) =>
        report(
          await inBatches(targets, (batch) =>
            api.POST("/nodes/delete", { body: { ids: batch.map((target) => target.id) } }),
          ),
        ),
      onDone: (done) => {
        if (done.length === 0) return;
        void queryClient.invalidateQueries({ queryKey: ["nodes"] });
        onDeleted?.(done.map((target) => target.id));
      },
    },
  ];
  return (
    <ActionsMenu
      targets={nodes}
      actions={ACTIONS}
      dataActions={dataActions}
      onCompare={onCompare}
      onTopology={onTopology}
      prefix="nodes.actions"
      // `node_id` alone targets the node, as in the historical collector.
      enqueue={(target, action) => ({ node_id: target.id, action })}
    />
  );
}
