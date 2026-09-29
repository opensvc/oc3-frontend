import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailPanel } from "@/components/opensvc/DetailPanel";
import { problemText } from "@/lib/api/problem";
import { useCredentials } from "@/lib/api/auth";
import { EDITABLE_USER_GROUPS, USER_PROPS_QUERY } from "./user-fields";
import { useSaveUser } from "./use-save-user";

type UserRow = components["schemas"]["UserRow"];

/**
 * Detail of a user. The name and email carry a pencil: a user may change their
 * own, a UserManager anyone's, and the server refuses the others with a message
 * under the field — the interface does not know the caller's privileges yet.
 */
export function UserDetailPanel({
  userId,
  label,
  onClose,
}: {
  userId: string | undefined;
  label: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const credentials = useCredentials();
  const {
    data: user,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["user", userId],
    enabled: userId !== undefined,
    queryFn: async () => {
      const { data, error: failure } = await api.GET("/users/{user_id}", {
        params: { path: { user_id: userId ?? "" }, query: { props: USER_PROPS_QUERY } },
      });
      if (failure !== undefined) throw new Error(problemText(failure));
      const rows: UserRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });

  const isSelf =
    credentials !== null &&
    user?.email !== undefined &&
    user.email.toLowerCase() === credentials.user.toLowerCase();
  const save = useSaveUser(userId, isSelf);

  return (
    <DetailPanel
      kind="user"
      recordId={userId}
      open={userId !== undefined}
      title={user?.email ?? (label === "" ? t("users.detail.title") : label)}
      onClose={onClose}
      groups={EDITABLE_USER_GROUPS}
      row={user}
      labelPrefix="users.fields"
      groupPrefix="users.detail.groups"
      isPending={isPending}
      errorMessage={isError ? error.message : null}
      onSave={save}
      editHint={t("users.detail.editHint")}
    />
  );
}
