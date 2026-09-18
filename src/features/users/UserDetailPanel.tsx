import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailPanel } from "@/components/opensvc/DetailPanel";
import { problemText } from "@/lib/api/problem";
import { USER_GROUPS, USER_PROPS_QUERY } from "./user-fields";

type UserRow = components["schemas"]["UserRow"];

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

  return (
    <DetailPanel
      kind="user"
      open={userId !== undefined}
      title={user?.email ?? (label === "" ? t("users.detail.title") : label)}
      onClose={onClose}
      groups={USER_GROUPS}
      row={user}
      labelPrefix="users.fields"
      groupPrefix="users.detail.groups"
      isPending={isPending}
      errorMessage={isError ? error.message : null}
    />
  );
}
