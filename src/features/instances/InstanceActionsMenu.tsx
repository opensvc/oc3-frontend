import { ActionsMenu, type ActionEntry, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { fromInstanceId } from "./instance-id";

/**
 * Agent actions of an instance, the instance entries of the historical collector
 * (`on_services_instances`): start, stop and restart at the top, then placement
 * (switch, takeover, giveback), replication, freeze and thaw, and in submenus the
 * maintenance of the instance, the compliance runs on the modules attached to the
 * service, and the inventory pushes.
 */
const INSTANCE_ACTIONS: readonly ActionEntry[] = [
  { action: "start" },
  { action: "stop" },
  { action: "restart" },
  { action: "switch", group: "placement", separatorBefore: true },
  { action: "takeover", group: "placement" },
  { action: "giveback", group: "placement" },
  { action: "syncall", group: "sync" },
  { action: "syncnodes", group: "sync" },
  { action: "syncdrp", group: "sync" },
  { action: "freeze", separatorBefore: true },
  { action: "thaw" },
  { action: "enable", group: "maintenance", separatorBefore: true },
  { action: "disable", group: "maintenance" },
  { action: "abort", group: "maintenance" },
  { action: "clear", group: "maintenance" },
  { action: "compliance_check", group: "compliance" },
  { action: "compliance_fix", group: "compliance" },
  { action: "push config", group: "inventory" },
  { action: "push resinfo", group: "inventory" },
];

/**
 * Agent actions of an instance: the same as for a service, but posted on its node and
 * limited to that instance (the API adds `--local`). The target is named by the
 * instance id `svc_id@node_id`, followed by `@mon_vmname` for a container of an
 * encapsulated service: the agent acts on the service on the node, so the
 * containers of one node make a single target.
 *
 * Queued through `PUT /actions` with the service and the node, as the historical
 * collector and its REST API do, rather than through an endpoint of their own.
 */
export function InstanceActionsMenu({ instances }: { instances: ActionTarget[] }) {
  const targets = [
    ...new Map(
      instances.map((target) => {
        const key = fromInstanceId(target.id);
        if (key === null) return [target.id, target] as const;
        const id = `${key.svcId}@${key.nodeId}`;
        const suffix = key.vmname === undefined ? "" : ` (${key.vmname})`;
        const name =
          suffix !== "" && target.name.endsWith(suffix)
            ? target.name.slice(0, -suffix.length)
            : target.name;
        return [id, { ...target, id, name }] as const;
      }),
    ).values(),
  ];
  return (
    <ActionsMenu
      targets={targets}
      actions={INSTANCE_ACTIONS}
      prefix="instances.actions"
      queue={async (target, action) => {
        const key = fromInstanceId(target.id);
        if (key === null) return "invalid instance id";
        const { error } = await api.PUT("/actions", {
          body: { svc_id: key.svcId, node_id: key.nodeId, action },
        });
        return error === undefined ? null : problemText(error);
      }}
    />
  );
}
