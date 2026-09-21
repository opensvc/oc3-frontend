import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { ActionsMenu, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { readProp } from "@/lib/row";

/**
 * Ce qu'on peut faire d'une ligne de la file, avec le statut que l'API attend :
 * annuler une action qui n'a pas encore été dépilée, ou remettre en file une action
 * terminée ou annulée. L'API refuse les autres combinaisons (`post_actions.go`,
 * repris de `api_action_queue.py`) : annuler une action terminée, ou refaire une
 * action qui attend déjà.
 */
const STATUS: Record<string, string> = { cancel: "C", redo: "W" };

const ACTIONS = [{ action: "cancel" }, { action: "redo" }] as const;

/**
 * Menu des actions de la file, sur le modèle de celui des nodes : une entrée
 * choisie, confirmée, puis appliquée à chaque ligne visée, et un compte rendu qui
 * nomme les refus.
 */
export function ActionQueueMenu({ actions }: { actions: ActionTarget[] }) {
  const queryClient = useQueryClient();

  return (
    <ActionsMenu
      targets={actions}
      actions={ACTIONS}
      prefix="actions.queueActions"
      queue={async (target, action) => {
        const { data, error } = await api.POST("/actions", {
          body: { id: target.id, status: STATUS[action] ?? "" },
        });
        if (error !== undefined) return problemText(error);
        // L'API rend ses refus en 200 avec une clé `error`, comme l'ancien collector.
        const refusal = readProp(data, "error");
        if (typeof refusal === "string" && refusal !== "") return refusal;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["actions"] }),
          queryClient.invalidateQueries({ queryKey: ["action", target.id] }),
        ]);
        return null;
      }}
    />
  );
}
