import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { NodeDetailPanel } from "@/features/nodes/NodeDetailPanel";
import { ServiceDetailPanel } from "@/features/services/ServiceDetailPanel";
import { InstanceDetailPanel } from "@/features/instances/InstanceDetailPanel";
import { AppDetailPanel } from "@/features/apps/AppDetailPanel";
import { GroupDetailPanel } from "@/features/groups/GroupDetailPanel";
import { ObjectIcon, type ObjectKind } from "@/components/opensvc/ObjectIcon";
import { useObjectLabels } from "@/components/opensvc/object-label";
import { TrailContext, type TrailStep } from "@/components/ui/trail";
import { currentIndex, parseTrail } from "@/lib/peek-trail";

/**
 * Record of an object looked at from another view.
 *
 * A badge in a cell (`CrossLink`) opens here the record of the node, the service,
 * the instance, the application code or the team it names, without leaving the list
 * nor losing its sort, its page or its selection. Placed in the application shell:
 * every view benefits from it, and there is only one panel of this kind on screen.
 *
 * The path followed lives in the URL (`peek`), like the row panel: a shared link
 * reopens the same record with the same breadcrumb, and Escape or the cross closes
 * it. The row panel and this one do not coexist: `toSearchParams` clears the record
 * as soon as a row is selected, and the row panel wins if the URL carries both.
 */
export function PeekPanel() {
  const { t } = useTranslation();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  // The row panel wins: a hand-written URL may carry both, and two stacked drawers do
  // not close one another.
  const rowPanelOpen = typeof search.sel === "string" && search.sel !== "";
  const trail = rowPanelOpen ? [] : parseTrail(search.peek);
  const at = currentIndex(trail, search.peekat);
  const current = trail[at];
  const tab = typeof search.peektab === "string" ? search.peektab : undefined;
  const labels = useObjectLabels(trail);

  function update(next: { peek?: string; peektab?: string; peekat?: number; sel?: string }) {
    void navigate({
      to: ".",
      search: (previous) => ({ ...(previous as Record<string, unknown>), ...next }),
      resetScroll: false,
    });
  }

  const close = () => {
    update({ peek: undefined, peektab: undefined, peekat: undefined });
  };
  const onTabChange = (next: string | undefined) => {
    update({ peektab: next });
  };

  /**
   * Moving to an entry of the history: only the cursor moves, so everything visited
   * stays one click away, forward as well as back.
   */
  function goTo(index: number) {
    if (trail[index] === undefined) return;
    update({ peekat: index, peektab: undefined });
  }

  const steps: TrailStep[] = trail.map((step, index) => ({
    key: `${step.kind}:${step.id}`,
    label: labels[index] ?? step.id,
    icon: <ObjectIcon kind={step.kind as ObjectKind} className="h-3.5 w-3.5 shrink-0" />,
    onSelect:
      index === at
        ? undefined
        : () => {
            goTo(index);
          },
  }));

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
      default:
        return null;
    }
  })();

  if (panel === null) return null;
  return (
    <TrailContext.Provider value={steps}>
      {panel}
      <span className="sr-only">{t("trail.label")}</span>
    </TrailContext.Provider>
  );
}
