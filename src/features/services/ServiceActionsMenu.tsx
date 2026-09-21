import { ActionsMenu, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

/**
 * Agent actions of a service. The API posts them on a node of the service seen alive
 * in the last fifteen minutes, and without `--local`: they apply to the whole
 * service, not to that one instance. As for nodes, only the actions that do not
 * interrupt the service are offered; start, stop, switch, synchronisations and
 * provisioning are left out for now, here as in the API allowlist (`serviceActions`,
 * `post_service_action.go`).
 */
export const SERVICE_ACTIONS = [
  { action: "push resinfo" },
  { action: "push config" },
  { action: "freeze", separatorBefore: true },
  { action: "thaw" },
] as const;

export function ServiceActionsMenu({ services }: { services: ActionTarget[] }) {
  return (
    <ActionsMenu
      targets={services}
      actions={SERVICE_ACTIONS}
      prefix="services.actions"
      queue={async (target, action) => {
        const { error } = await api.POST("/services/{svc_id}/actions", {
          params: { path: { svc_id: target.id } },
          body: { action: action as "freeze" },
        });
        return error === undefined ? null : problemText(error);
      }}
    />
  );
}
