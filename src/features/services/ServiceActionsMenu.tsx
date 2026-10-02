import { ActionsMenu, type ActionEntry, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

/**
 * Agent actions of a whole service, the service entries of the historical collector
 * (`am_svc_agent_leafs`). The API posts them on a node of the service seen alive in
 * the last fifteen minutes, without `--local`: they apply to the service, not to
 * that one instance. Start, stop, switch and giveback, the orchestration one runs
 * most, stay at the top with freeze and thaw; the recovery of a failed action and
 * the inventory pushes go in submenus.
 */
const SERVICE_ACTIONS: readonly ActionEntry[] = [
  { action: "start" },
  { action: "stop" },
  { action: "switch" },
  { action: "giveback" },
  { action: "freeze", separatorBefore: true },
  { action: "thaw" },
  { action: "abort", group: "recovery", separatorBefore: true },
  { action: "clear", group: "recovery" },
  { action: "push config", group: "inventory" },
  { action: "push resinfo", group: "inventory" },
];

export function ServiceActionsMenu({ services }: { services: ActionTarget[] }) {
  return (
    <ActionsMenu
      targets={services}
      actions={SERVICE_ACTIONS}
      prefix="services.actions"
      queue={async (target, action) => {
        // `svc_id` alone targets the whole service, as in the historical collector.
        const { error } = await api.PUT("/actions", { body: { svc_id: target.id, action } });
        return error === undefined ? null : problemText(error);
      }}
    />
  );
}
