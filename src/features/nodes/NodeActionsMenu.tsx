import { ActionsMenu, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

/**
 * Agent actions of a node, in menu order: the inventory pushes, then the hardware,
 * then the state of the node. These are the "node agent" entries of the old collector
 * that do not interrupt the service; reboot, shutdown, drain and agent update are
 * left out for now, here as in the API allowlist (`nodeActions`,
 * `queue_node_action.go`).
 */
const ACTIONS = [
  { action: "pushasset" },
  { action: "pushdisks" },
  { action: "pushpkg" },
  { action: "pushpatch" },
  { action: "pushstats" },
  { action: "checks" },
  { action: "sysreport" },
  { action: "scanscsi", separatorBefore: true },
  { action: "freeze", separatorBefore: true },
  { action: "thaw" },
] as const;

export function NodeActionsMenu({ nodes }: { nodes: ActionTarget[] }) {
  return (
    <ActionsMenu
      targets={nodes}
      actions={ACTIONS}
      prefix="nodes.actions"
      queue={async (target, action) => {
        // `node_id` alone targets the node, as in the historical collector.
        const { error } = await api.PUT("/actions", { body: { node_id: target.id, action } });
        return error === undefined ? null : problemText(error);
      }}
    />
  );
}
