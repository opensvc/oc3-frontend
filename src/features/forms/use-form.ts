import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";

export type FormRow = components["schemas"]["FormRow"];

/** Types of a form, as the forms table enumerates them. */
export const FORM_TYPES = ["custo", "obj", "folder", "generic"] as const;

export type FormType = (typeof FORM_TYPES)[number];

export function isFormType(value: unknown): value is FormType {
  return typeof value === "string" && FORM_TYPES.includes(value as FormType);
}

/** Loads a form with its definition; shared with the edit form, which starts from it. */
export function useForm(formId: string | undefined) {
  return useQuery({
    queryKey: ["form", formId],
    enabled: formId !== undefined,
    queryFn: async () => {
      const { data, error } = await api.GET("/forms/{form_id}", {
        params: {
          path: { form_id: Number(formId) },
          query: {
            props:
              "id,form_name,form_type,form_folder,form_author,form_created,form_yaml,form_definition",
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: FormRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });
}
