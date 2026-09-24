import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import type { FormUser } from "./form-engine";

type UserRow = components["schemas"]["UserRow"];

/** The signed-in user, for the __user_*__ defaults of the forms. */
export function useFormUser() {
  return useQuery({
    queryKey: ["user", "self", "form-defaults"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FormUser> => {
      const { data, error } = await api.GET("/users/{user_id}", {
        params: {
          path: { user_id: "self" },
          query: { props: "id,first_name,last_name,email,phone_work" },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: UserRow[] = Array.isArray(data.data) ? data.data : [];
      const row = rows[0];
      return {
        id: row?.id === undefined ? "" : String(row.id),
        name: `${row?.first_name ?? ""} ${row?.last_name ?? ""}`,
        email: row?.email ?? "",
        phoneWork: row?.phone_work ?? "",
      };
    },
  });
}
