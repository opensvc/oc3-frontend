import { ActionsMenu, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

/**
 * Actions d'agent d'un service. L'API les pose sur un node du service vu vivant
 * depuis moins de quinze minutes, et sans `--local` : elles valent pour le service
 * entier, pas pour cette instance-là. Comme pour les nodes, seules les actions qui
 * n'interrompent pas le service sont proposées ; démarrage, arrêt, bascule,
 * synchronisations et provisionnement sont écartés pour l'instant, ici comme dans
 * la liste blanche de l'API (`serviceActions`, `post_service_action.go`).
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
