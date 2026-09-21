import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { ActionsMenu, type ActionTarget } from "@/components/opensvc/ActionsMenu";
import { readProp } from "@/lib/row";

/**
 * What can be done with a row of the queue, with the status the API expects: cancel
 * an action not yet taken, or queue again an action finished or cancelled. The API
 * refuses the other combinations (`post_actions.go`, taken from
 * `api_action_queue.py`): cancelling a finished action, or redoing an action that is
 * already waiting.
 */
const STATUS: Record<string, string> = { cancel: "C", redo: "W" };

const ACTIONS = [{ action: "cancel" }, { action: "redo" }] as const;

/**
 * Actions menu of the queue, on the model of the one for nodes: an entry chosen,
 * confirmed, then applied to each row aimed at, and a report that names the refusals.
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
        // The API returns its refusals as 200 with an `error` key, like the old collector.
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
