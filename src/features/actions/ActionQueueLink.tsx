import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { isPending, toActionRows } from "./action-row";

/**
 * Number of actions still waiting in the queue.
 *
 * The API cannot filter a list by status nor return its total: the page is therefore
 * read then counted here, capped, and refreshed at a regular interval — the queue
 * moves without the user acting, it is the agent that drains it.
 */
const LIMIT = 200;

function usePendingActions() {
  return useQuery({
    queryKey: ["actions", "pending"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await api.GET("/actions", {
        params: { query: { props: "id,status", limit: LIMIT, orderby: "-id" } },
      });
      // Une file illisible ne doit pas encombrer la barre du haut : on n'en dit rien.
      if (error !== undefined) return 0;
      return toActionRows(data.data).filter((row) => isPending(row.status)).length;
    },
  });
}

/**
 * "Action queue" entry of the top bar: always a link to the queue, which also keeps
 * the past actions, with the number of those still waiting when there are any.
 */
export function ActionQueueLink() {
  const { t } = useTranslation();
  const pending = usePendingActions();
  const count = pending.data ?? 0;

  return (
    <Link
      to="/actions"
      title={count === 0 ? t("header.actionQueueEmpty") : t("header.actionQueuePending", { count })}
      className="flex items-center gap-1.5 text-ink-muted hover:text-ink"
    >
      {t("header.actionQueue")}
      {count > 0 && (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-state-warn-soft px-1.5 text-[0.6875rem] leading-4 font-medium text-state-warn tabular-nums">
          {count}
          {count === LIMIT && "+"}
        </span>
      )}
    </Link>
  );
}
