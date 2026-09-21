import { useNavigate, useSearch } from "@tanstack/react-router";
import { NodeDetailPanel } from "@/features/nodes/NodeDetailPanel";
import { ServiceDetailPanel } from "@/features/services/ServiceDetailPanel";
import { InstanceDetailPanel } from "@/features/instances/InstanceDetailPanel";
import { AppDetailPanel } from "@/features/apps/AppDetailPanel";
import { GroupDetailPanel } from "@/features/groups/GroupDetailPanel";

/** Sépare `kind:identifiant`, l'identifiant pouvant contenir « : » (rien n'en a). */
function parsePeek(peek: unknown): { kind: string; id: string } | null {
  if (typeof peek !== "string") return null;
  const cut = peek.indexOf(":");
  if (cut <= 0 || cut === peek.length - 1) return null;
  return { kind: peek.slice(0, cut), id: peek.slice(cut + 1) };
}

/**
 * Fiche d'un objet regardé depuis une autre vue.
 *
 * Une puce de cellule (`CrossLink`) ouvre ici la fiche du node, du service, de
 * l'instance, du code application ou de l'équipe qu'elle nomme, sans quitter la
 * liste ni perdre son tri, sa page ou sa sélection. Posé dans la coquille de
 * l'application : toutes les vues en profitent, et il n'y a qu'un panneau de ce
 * genre à l'écran.
 *
 * L'objet regardé vit dans l'URL (`peek`), comme le panneau de la ligne : un lien
 * partagé rouvre la même fiche, et Échap ou la croix la referme. Les deux ne
 * coexistent pas : `toSearchParams` efface la fiche dès qu'une ligne est
 * sélectionnée, et le panneau de la ligne l'emporte si l'URL porte les deux.
 */
export function PeekPanel() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  // Le panneau de la ligne l'emporte : une URL écrite à la main peut porter les deux,
  // et deux tiroirs superposés ne se referment pas l'un l'autre.
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
