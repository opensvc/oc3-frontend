import { useNavigate, useSearch } from "@tanstack/react-router";
import { NodeDetailPanel } from "@/features/nodes/NodeDetailPanel";
import { ServiceDetailPanel } from "@/features/services/ServiceDetailPanel";
import { InstanceDetailPanel } from "@/features/instances/InstanceDetailPanel";
import { AppDetailPanel } from "@/features/apps/AppDetailPanel";
import { GroupDetailPanel } from "@/features/groups/GroupDetailPanel";

/** Splits `kind:id`, the id being allowed to contain ":" (none does). */
function parsePeek(peek: unknown): { kind: string; id: string } | null {
  if (typeof peek !== "string") return null;
  const cut = peek.indexOf(":");
  if (cut <= 0 || cut === peek.length - 1) return null;
  return { kind: peek.slice(0, cut), id: peek.slice(cut + 1) };
}

/**
 * Record of an object looked at from another view.
 *
 * A badge in a cell (`CrossLink`) opens here the record of the node, the service,
 * the instance, the application code or the team it names, without leaving the list
 * nor losing its sort, its page or its selection. Placed in the application shell:
 * every view benefits from it, and there is only one panel of this kind on screen.
 *
 * The object looked at lives in the URL (`peek`), like the row panel: a shared link
 * reopens the same record, and Escape or the cross closes it. The two do not
 * coexist: `toSearchParams` clears the record as soon as a row is selected, and the
 * row panel wins if the URL carries both.
 */
export function PeekPanel() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  // The row panel wins: a hand-written URL may carry both, and two stacked drawers do
  // not close one another.
  const peeked =
    typeof search.sel === "string" && search.sel !== "" ? null : parsePeek(search.peek);
  const tab = typeof search.peektab === "string" ? search.peektab : undefined;

  function update(next: { peek?: string; peektab?: string }) {
    void navigate({
      to: ".",
      search: (previous) => ({ ...(previous as Record<string, unknown>), ...next }),
      resetScroll: false,
    });
  }

  const close = () => {
    update({ peek: undefined, peektab: undefined });
  };
  const onTabChange = (next: string | undefined) => {
    update({ peektab: next });
  };

  const id = peeked?.id;
  switch (peeked?.kind) {
    case "node":
      return (
        <NodeDetailPanel
          nodeId={id}
          nodename=""
          tab={tab}
          onTabChange={onTabChange}
          onClose={close}
        />
      );
    case "service":
      return (
        <ServiceDetailPanel
          svcId={id}
          svcname=""
          tab={tab}
          onTabChange={onTabChange}
          onClose={close}
        />
      );
    case "instance":
      return <InstanceDetailPanel instanceId={id} label="" onClose={close} />;
    case "app":
      return <AppDetailPanel appId={id} label="" onClose={close} />;
    case "group":
      return <GroupDetailPanel groupId={id} label="" onClose={close} />;
    default:
      return null;
  }
}
