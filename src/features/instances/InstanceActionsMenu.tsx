import { ActionsMenu, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { SERVICE_ACTIONS } from "@/features/services/ServiceActionsMenu";
import { fromInstanceId } from "./instance-id";

/**
 * Agent actions of an instance: the same as for a service, but posted on its node and
 * limited to that instance (the API adds `--local`). The target is named by the
 * instance id `svc_id@node_id`.
 */
export function InstanceActionsMenu({ instances }: { instances: ActionTarget[] }) {
  return (
    <ActionsMenu
      targets={instances}
      actions={SERVICE_ACTIONS}
      prefix="instances.actions"
      queue={async (target, action) => {
        const key = fromInstanceId(target.id);
        if (key === null) return "invalid instance id";
        const { error } = await api.POST("/services/{svc_id}/instances/{node_id}/actions", {
          params: { path: { svc_id: key.svcId, node_id: key.nodeId } },
          body: { action: action as "freeze" },
        });
        return error === undefined ? null : problemText(error);
      }}
    />
  );
}
