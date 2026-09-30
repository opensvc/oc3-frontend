import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { startRealtime, stopRealtime, useRealtimeStatus } from "@/lib/realtime";

/**
 * Live updates of the signed-in session, and their state in the top bar: a filled
 * dot and "Live" while the views follow the collector, a hollow one and "Offline"
 * while the connection is being made again. The dot and the word, not a tint
 * alone, tell the two apart. Rendered only once someone is signed in: the
 * connection starts with it and stops at sign-out.
 */
export function LiveIndicator() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const status = useRealtimeStatus();

  useEffect(() => {
    startRealtime(queryClient);
    return stopRealtime;
  }, [queryClient]);

  const live = status === "live";
  return (
    <span
      role="status"
      title={live ? t("realtime.liveHint") : t("realtime.offlineHint")}
      className={`flex items-center gap-1.5 text-data ${live ? "text-ink-muted" : "text-state-warn"}`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full border ${live ? "border-state-up bg-state-up" : "border-current"}`}
      />
      {live ? t("realtime.live") : t("realtime.offline")}
    </span>
  );
}
