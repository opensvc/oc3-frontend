import { useNavigate, useSearch } from "@tanstack/react-router";
import { NodeDetailPanel } from "@/features/nodes/NodeDetailPanel";
import { ServiceDetailPanel } from "@/features/services/ServiceDetailPanel";
import { InstanceDetailPanel } from "@/features/instances/InstanceDetailPanel";
import { AppDetailPanel } from "@/features/apps/AppDetailPanel";
import { DiskDetailPanel } from "@/features/disks/DiskDetailPanel";
import { NetworkDetailPanel } from "@/features/networks/NetworkDetailPanel";
import { GroupDetailPanel } from "@/features/groups/GroupDetailPanel";
import { UserDetailPanel } from "@/features/users/UserDetailPanel";
import { TagDetailPanel } from "@/features/tags/TagDetailPanel";
import { FiltersetDetailPanel } from "@/features/filtersets/FiltersetDetailPanel";
import { FormDetailPanel } from "@/features/forms/FormDetailPanel";
import { useTag } from "@/features/tags/use-tag";
import { currentIndex, parseTrail } from "@/lib/peek-trail";

/**
 * Record of an object looked at from another view.
 *
 * A badge in a cell (`CrossLink`) opens here the record of the node, the service,
 * the instance, the application code, the team or the tag it names, without leaving the list
 * nor losing its sort, its page or its selection. Placed in the application shell:
 * every view benefits from it, and there is only one panel of this kind on screen.
 *
 * The record lives in the URL (`peek`), like the row panel: a shared link reopens it,
 * and Escape or the cross closes it. The bookmarks (`BookmarksProvider`) open their
 * records here too, from any view, disks and network addresses included, and so does
 * the global search, filtersets and forms included. The row panel and this one do not coexist: `toSearchParams` clears the record
 * as soon as a row is selected, and the row panel wins if the URL carries both.
 */
export function PeekPanel() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  // The row panel wins: a hand-written URL may carry both, and two stacked drawers do
  // not close one another.
  const rowPanelOpen = typeof search.sel === "string" && search.sel !== "";
  const trail = rowPanelOpen ? [] : parseTrail(search.peek);
  const at = currentIndex(trail, search.peekat);
  const current = trail[at];
  const tab = typeof search.peektab === "string" ? search.peektab : undefined;

  function update(next: { peek?: string; peektab?: string; peekat?: number; sel?: string }) {
    void navigate({
      to: ".",
      // Another record or tab: the category a tab had shown (`diff`) no longer applies.
      search: (previous) => ({
        ...(previous as Record<string, unknown>),
        diff: undefined,
        ...next,
      }),
      resetScroll: false,
    });
  }

  const close = () => {
    update({ peek: undefined, peektab: undefined, peekat: undefined });
  };
  const onTabChange = (next: string | undefined) => {
    update({ peektab: next });
  };

  const id = current?.id;
  const panel = (() => {
    switch (current?.kind) {
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
      case "user":
        return <UserDetailPanel userId={id} label="" onClose={close} />;
      case "disk":
        return <DiskDetailPanel diskId={id} label="" onClose={close} />;
      case "network":
        return <NetworkDetailPanel ipId={id} label="" onClose={close} />;
      case "filterset":
        return <FiltersetDetailPanel filtersetId={id} label="" onClose={close} />;
      case "form":
        return (
          <FormDetailPanel
            formId={id}
            name=""
            tab={tab}
            onTabChange={onTabChange}
            onClose={close}
            // Editing a definition takes the room of the Forms view, where the
            // record opens again to be edited.
            onEdit={() => {
              void navigate({ to: "/forms", search: { sel: id } });
            }}
          />
        );
      case "tag":
        return <TagPeek tagId={id} onClose={close} />;
      default:
        return null;
    }
  })();

  return panel;
}

/** A tag opened from a badge: read by its id, then shown like a row of the Tags list. */
function TagPeek({ tagId, onClose }: { tagId: string | undefined; onClose: () => void }) {
  const { tag, isPending, errorMessage } = useTag(tagId);
  return (
    <TagDetailPanel
      tag={tag}
      open={tagId !== undefined}
      isPending={isPending}
      errorMessage={errorMessage}
      onClose={onClose}
    />
  );
}
