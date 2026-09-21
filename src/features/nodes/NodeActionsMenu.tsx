import { ActionsMenu, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

/**
 * Actions d'agent d'un node, dans l'ordre du menu : les remontées d'inventaire, puis
 * le matériel, puis l'état du node. Ce sont les entrées « node agent » de l'ancien
 * collector qui n'interrompent pas le service ; redémarrage, arrêt, drain et mise à
 * jour de l'agent sont écartés pour l'instant, ici comme dans la liste blanche de
 * l'API (`nodeActions`, `post_node_action.go`).
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
        const { error } = await api.POST("/nodes/{node_id}/actions", {
          params: { path: { node_id: target.id } },
          body: { action: action as "pushasset" },
        });
        return error === undefined ? null : problemText(error);
      }}
    />
  );
}
