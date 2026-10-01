import { useTranslation } from "react-i18next";
import { UserIcon } from "@/components/ui/icons";
import { useCredentials } from "@/lib/api/auth";
import { useImpersonation } from "@/lib/api/impersonation";
import { stopImpersonating } from "@/lib/session";

/**
 * Strip under the top bar while the signed-in administrator acts as another user:
 * every view then shows, and every action does, what that user would. It names
 * both users, the icon and the wording telling the state rather than the tint
 * alone, and gives the way back.
 */
export function ImpersonationBanner() {
  const { t } = useTranslation();
  const impersonation = useImpersonation();
  const credentials = useCredentials();
  if (impersonation === null || credentials === null) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-state-warn bg-state-warn-soft px-3 py-1.5"
    >
      <UserIcon className="shrink-0 text-state-warn" />
      <p className="min-w-0 truncate">
        {t("impersonation.actingAs")}{" "}
        <strong className="font-semibold">{impersonation.email}</strong>
        <span className="text-ink-muted">
          {" "}
          · {t("impersonation.signedInAs", { user: credentials.user })}
        </span>
      </p>
      <button
        type="button"
        onClick={stopImpersonating}
        className="ml-auto h-7 shrink-0 rounded-(--radius-control) border border-line-strong bg-surface-raised px-3 hover:bg-surface"
      >
        {t("impersonation.stop")}
      </button>
    </div>
  );
}
