import { useTranslation } from "react-i18next";
import { UserIcon } from "@/components/ui/icons";

/**
 * The user of an entry, and below, when the action was made as that user by
 * another (impersonation), the user who really signed in: in words, never by a
 * tint alone.
 */
export function LogUser({
  user,
  impersonator,
}: {
  user: string | undefined;
  impersonator: string | undefined;
}) {
  const { t } = useTranslation();
  if (impersonator === undefined || impersonator === "") return <>{user}</>;
  const label = t("logs.impersonatedBy", { impersonator, user: user ?? "" });
  return (
    <span title={label}>
      {user}
      <span className="mt-0.5 flex items-center gap-1 text-data text-state-warn">
        <UserIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
        <span>{t("logs.via", { impersonator })}</span>
        <span className="sr-only">{label}</span>
      </span>
    </span>
  );
}
