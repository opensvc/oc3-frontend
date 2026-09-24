import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { FolderIcon, PuzzleIcon, SearchIcon } from "@/components/ui/icons";
import { parseDefinition } from "@/features/forms/form-engine";
import { FormRender } from "@/features/forms/FormRender";
import { useFormUser } from "@/features/forms/use-form-user";
import { RequestResults } from "./RequestResults";
import { catalogGroups, type CatalogEntry, type CatalogForm } from "./catalog";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** The forms the user may submit: those published to one of their groups. */
function useCatalog() {
  return useQuery({
    queryKey: ["forms", "catalog"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<CatalogForm[]> => {
      const { data, error } = await api.GET("/forms", {
        params: {
          query: {
            props: "id,form_name,form_type,form_folder,form_definition",
            limit: 0,
            meta: "0",
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows = Array.isArray(data.data) ? data.data : [];
      return rows.flatMap((row) =>
        row.id === undefined
          ? []
          : [
              {
                id: row.id,
                name: row.form_name ?? "",
                type: row.form_type ?? "",
                folder: row.form_folder ?? "/",
                definition: isRecord(row.form_definition) ? row.form_definition : null,
              },
            ],
      );
    },
  });
}

/**
 * New request: the catalog of the forms the user may submit, all of them grouped
 * by folder, narrowed as the search is typed. Choosing a form opens it to fill;
 * submitting it creates the request and follows its outputs.
 */
export function NewRequestPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/requests" });
  const navigate = useNavigate({ from: "/requests" });
  const catalog = useCatalog();
  // The search lives in the page, not the URL: it is kept while a form is open
  // and the page is not left, and dropped otherwise.
  const [query, setQuery] = useState("");

  const selected = catalog.data?.find((f) => String(f.id) === search.form);
  const groups = useMemo(() => catalogGroups(catalog.data ?? [], query), [catalog.data, query]);

  return (
    <section className="max-w-5xl">
      <h1 className="mb-1 flex items-center gap-2 text-title font-semibold">
        <ObjectIcon kind="form" className="h-5 w-5" />
        {t("requests.title")}
      </h1>
      <p className="mb-4 text-ink-muted">{t("requests.intro")}</p>

      {search.form !== undefined ? (
        <RequestForm
          form={selected}
          isPending={catalog.isPending}
          onBack={() => {
            void navigate({ search: {} });
          }}
        />
      ) : (
        <>
          <div className="mb-3 flex h-8 w-72 items-center gap-1.5 rounded-(--radius-control) border border-line bg-surface px-2 text-ink-muted">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={t("requests.search")}
              aria-label={t("requests.search")}
              className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted"
            />
          </div>

          {catalog.isPending && <p className="text-ink-muted">{t("list.loading")}</p>}
          {catalog.isError && <p className="text-state-down">■ {catalog.error.message}</p>}
          {catalog.isSuccess && groups.length === 0 && (
            <p className="text-ink-muted">
              {query.trim() === "" ? t("requests.empty") : t("requests.noMatch")}
            </p>
          )}
          {groups.map((group) => (
            <section key={group.folder} aria-labelledby={`folder-${group.folder}`} className="mb-4">
              <h2
                id={`folder-${group.folder}`}
                className="mb-2 flex items-center gap-1.5 font-medium text-ink-muted"
              >
                <FolderIcon className="h-4 w-4" />
                {group.folder}
              </h2>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
                {group.entries.map((entry) => (
                  <li key={entry.key}>
                    <CatalogCard
                      entry={entry}
                      onOpen={() => {
                        void navigate({ search: { form: String(entry.form.id) } });
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </section>
  );
}

/** A form of the catalog, as a card to open. */
function CatalogCard({ entry, onOpen }: { entry: CatalogEntry; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full items-start gap-3 rounded-(--radius-panel) border border-line bg-surface-raised p-3 text-left hover:border-line-strong hover:bg-surface-sunken"
    >
      <span className="mt-0.5 shrink-0">
        <PuzzleIcon className="h-6 w-6 text-icon-form" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">{entry.label}</span>
        {entry.desc !== "" && (
          <span className="mt-1 line-clamp-3 text-ink-muted">{entry.desc}</span>
        )}
        {entry.label !== entry.form.name && (
          <span className="mt-1 block font-mono text-data text-ink-muted">{entry.form.name}</span>
        )}
      </span>
    </button>
  );
}

/** The chosen form, to fill and submit; the request's outcome once submitted. */
function RequestForm({
  form,
  isPending,
  onBack,
}: {
  form: CatalogForm | undefined;
  isPending: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const user = useFormUser();
  const def = useMemo(() => parseDefinition(form?.definition), [form]);
  const submit = useMutation({
    mutationFn: async (data: unknown) => {
      const { data: results, error } = await api.PUT("/forms/{form_id}", {
        params: { path: { form_id: form?.id ?? 0 } },
        body: { data },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return results as unknown;
    },
  });
  const resultsId =
    isRecord(submit.data) && typeof submit.data.results_id === "number"
      ? submit.data.results_id
      : null;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 h-7 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink"
      >
        ← {t("requests.back")}
      </button>
      {isPending || user.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : form === undefined ? (
        <p className="text-state-down">■ {t("requests.notFound")}</p>
      ) : user.isError ? (
        <p className="text-state-down">■ {user.error.message}</p>
      ) : def === null || def.output === null ? (
        <p className="text-ink-muted">{t("requests.unusable")}</p>
      ) : (
        <div className="rounded-(--radius-panel) border border-line bg-surface-raised p-4">
          <h2 className="font-semibold text-ink">{def.label || form.name}</h2>
          {def.desc !== "" && <p className="mb-4 whitespace-pre-line text-ink-muted">{def.desc}</p>}
          <FormRender
            key={form.id}
            def={def}
            user={user.data}
            onSubmit={(data) => {
              submit.mutate(data);
            }}
            submitLabel={submit.isPending ? t("requests.submitting") : t("requests.submit")}
          />
          {submit.isError && (
            <p role="alert" className="mt-3 text-state-down">
              ■ {submit.error.message}
            </p>
          )}
          {resultsId !== null && (
            <RequestResults key={resultsId} resultsId={resultsId} initial={submit.data} />
          )}
        </div>
      )}
    </div>
  );
}
