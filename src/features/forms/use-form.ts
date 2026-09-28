import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api, apiGetDynamic } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { parseDefinition, type FormDefinition } from "./form-engine";

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

/**
 * The definition of the form named `name`, null when there is none: a sub-form
 * input or a compliance variable names its form rather than giving its id. Cached
 * by name, so the rows sharing a form load it once.
 */
export function useFormDefinitionByName(name: string) {
  return useQuery({
    queryKey: ["form-by-name", name],
    enabled: name !== "",
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await apiGetDynamic("/forms", {
        props: "form_definition",
        filter: `form_name:eq:${name}`,
      });
      if (response.status >= 300) throw new Error(problemText(response.body));
      const body = response.body;
      const rows =
        typeof body === "object" && body !== null && "data" in body && Array.isArray(body.data)
          ? (body.data as unknown[])
          : [];
      const first = rows[0];
      return typeof first === "object" && first !== null && "form_definition" in first
        ? first.form_definition
        : null;
    },
    select: (raw): FormDefinition | null => (raw === null ? null : parseDefinition(raw)),
  });
}
