import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { useFiltersets } from "@/lib/api/filtersets";
import { problemText } from "@/lib/api/problem";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { CloseIcon } from "@/components/ui/icons";
import { FILTERSET_KEY, LOG_OPS, isLogOp, useFiltersetEntries, type LogOp } from "./filterset-api";

type FiltersetExportEntry = components["schemas"]["FiltersetExportEntry"];
type FilterRow = components["schemas"]["FilterRow"];

const CONTROL = "h-7 rounded-(--radius-control) border border-line bg-surface px-1";
const ICON_BUTTON =
  "flex h-7 w-7 items-center justify-center rounded-(--radius-control) border border-line text-ink-muted hover:text-ink disabled:opacity-40";

function entryKey(entry: FiltersetExportEntry): string {
  return entry.filter !== null && entry.filter !== undefined
    ? `f:${String(entry.filter.id)}`
    : `s:${entry.filterset ?? ""}`;
}

function entryLabel(entry: FiltersetExportEntry): string {
  const f = entry.filter;
  return f !== null && f !== undefined
    ? `${f.f_table}.${f.f_field} ${f.f_op} ${f.f_value}`
    : (entry.filterset ?? "");
}

function useFilters() {
  return useQuery({
    queryKey: ["filters", "all-labels"],
    queryFn: async () => {
      const { data, error } = await api.GET("/filters", {
        params: { query: { props: "id,f_label", orderby: "f_label", limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: FilterRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}

/**
 * Entrées d'un filterset, dans l'ordre : filtres et filtersets encapsulés, chacun joint
 * au précédent par un opérateur logique.
 *
 * Chaque changement est un appel d'attachement : `POST` sur une entrée existante met à
 * jour sa position et son opérateur, `DELETE` la détache. Un déplacement renumérote
 * toute la liste de 1 à n et n'envoie que les positions qui changent : les positions
 * stockées peuvent avoir des trous ou des doublons.
 */
export function FiltersetComposition({
  filtersetId,
  filtersetName,
}: {
  filtersetId: string;
  filtersetName: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const entries = useFiltersetEntries(filtersetId);
  const filters = useFilters();
  const filtersets = useFiltersets();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [kind, setKind] = useState<"filter" | "filterset">("filter");
  const [target, setTarget] = useState("");
  const [newOp, setNewOp] = useState<LogOp>("AND");

  const list = entries.data ?? [];

  async function attach(entry: { filter?: number; filterset?: string }, order: number, op: string) {
    const body = { f_order: order, f_log_op: isLogOp(op) ? op : "AND" };
    const result =
      entry.filter !== undefined
        ? await api.POST("/filtersets/{filterset_id}/filters/{f_id}", {
            params: { path: { filterset_id: filtersetId, f_id: String(entry.filter) } },
            body,
          })
        : await api.POST("/filtersets/{filterset_id}/filtersets/{child_id}", {
            params: { path: { filterset_id: filtersetId, child_id: entry.filterset ?? "" } },
            body,
          });
    if (result.error !== undefined) throw new Error(problemText(result.error));
  }

  function ref(entry: FiltersetExportEntry) {
    return entry.filter !== null && entry.filter !== undefined
      ? { filter: entry.filter.id }
      : { filterset: entry.filterset ?? "" };
  }

  /** Enchaîne des appels, puis relit tout ce que la composition influence. */
  async function run(steps: () => Promise<void>) {
    setBusy(true);
    setFailure(null);
    try {
      await steps();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      await queryClient.invalidateQueries({ queryKey: [FILTERSET_KEY] });
      // Les listes filtrées par ce filterset changent de contenu.
      await queryClient.invalidateQueries({ queryKey: ["nodes"] });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      setBusy(false);
    }
  }

  function move(index: number, offset: number) {
    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    if (moved === undefined) return;
    reordered.splice(index + offset, 0, moved);
    void run(async () => {
      for (const [position, entry] of reordered.entries()) {
        if (entry.f_order !== position + 1) await attach(ref(entry), position + 1, entry.f_log_op);
      }
    });
  }

  function changeOp(entry: FiltersetExportEntry, op: string) {
    void run(() => attach(ref(entry), entry.f_order, op));
  }

  function remove(entry: FiltersetExportEntry) {
    void run(async () => {
      const result =
        entry.filter !== null && entry.filter !== undefined
          ? await api.DELETE("/filtersets/{filterset_id}/filters/{f_id}", {
              params: { path: { filterset_id: filtersetId, f_id: String(entry.filter.id) } },
            })
          : await api.DELETE("/filtersets/{filterset_id}/filtersets/{child_id}", {
              params: { path: { filterset_id: filtersetId, child_id: entry.filterset ?? "" } },
            });
      if (result.error !== undefined) throw new Error(problemText(result.error));
    });
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (target === "") return;
    const order = list.reduce((max, entry) => Math.max(max, entry.f_order), 0) + 1;
    void run(async () => {
      await attach(
        kind === "filter" ? { filter: Number(target) } : { filterset: target },
        order,
        newOp,
      );
      setTarget("");
    });
  }

  const attachedFilters = new Set(list.flatMap((entry) => (entry.filter ? [entry.filter.id] : [])));
  const attachedFiltersets = new Set(
    list.flatMap((entry) => (entry.filterset ? [entry.filterset] : [])),
  );
  const filterOptions = (filters.data ?? []).filter(
    (row) => row.id !== undefined && !attachedFilters.has(row.id),
  );
  const filtersetOptions = (filtersets.data ?? []).filter(
    (name) => name !== filtersetName && !attachedFiltersets.has(name),
  );

  return (
    <section aria-busy={busy}>
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-ink-muted">
        <ObjectIcon kind="filter" />
        {t("filtersets.composition.title")}
      </h3>
      <p className="mb-2 text-ink-muted">{t("filtersets.composition.intro")}</p>

      {entries.isPending && <p className="text-ink-muted">{t("detail.loading")}</p>}
      {entries.isError && (
        <p role="alert" className="text-state-down">
          ■ {entries.error.message}
        </p>
      )}
      {entries.isSuccess && list.length === 0 && (
        <p className="text-ink-muted">{t("filtersets.composition.empty")}</p>
      )}

      {list.length > 0 && (
        <ol className="mb-3 flex flex-col gap-1">
          {list.map((entry, index) => {
            const label = entryLabel(entry);
            const isFilterset = entry.filter === null || entry.filter === undefined;
            return (
              <li key={entryKey(entry)} className="flex items-center gap-1.5">
                <span className="w-5 text-right text-ink-muted tabular-nums">{index + 1}</span>
                <select
                  aria-label={t("filtersets.composition.operatorFor", { label })}
                  value={entry.f_log_op}
                  disabled={busy}
                  onChange={(event) => {
                    changeOp(entry, event.target.value);
                  }}
                  className={`${CONTROL} w-24`}
                >
                  {!isLogOp(entry.f_log_op) && (
                    <option value={entry.f_log_op}>{entry.f_log_op}</option>
                  )}
                  {LOG_OPS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <ObjectIcon kind={isFilterset ? "filterset" : "filter"} />
                  {isFilterset ? (
                    <Link
                      to="/filtersets"
                      search={{ sel: entry.filterset ?? "" }}
                      className="truncate underline decoration-line underline-offset-2"
                      title={t("filtersets.composition.openFilterset")}
                    >
                      {label}
                    </Link>
                  ) : (
                    <code className="truncate">{label}</code>
                  )}
                </span>
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => {
                    move(index, -1);
                  }}
                  title={t("filtersets.composition.up", { label })}
                  className={ICON_BUTTON}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="sr-only">{t("filtersets.composition.up", { label })}</span>
                </button>
                <button
                  type="button"
                  disabled={busy || index === list.length - 1}
                  onClick={() => {
                    move(index, 1);
                  }}
                  title={t("filtersets.composition.down", { label })}
                  className={ICON_BUTTON}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="sr-only">{t("filtersets.composition.down", { label })}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    remove(entry);
                  }}
                  title={t("filtersets.composition.remove", { label })}
                  className={ICON_BUTTON}
                >
                  <CloseIcon />
                  <span className="sr-only">{t("filtersets.composition.remove", { label })}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <form onSubmit={add} className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label={t("filtersets.composition.addOperator")}
          value={newOp}
          disabled={busy}
          onChange={(event) => {
            if (isLogOp(event.target.value)) setNewOp(event.target.value);
          }}
          className={`${CONTROL} w-24`}
        >
          {LOG_OPS.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
        <select
          aria-label={t("filtersets.composition.addKind")}
          value={kind}
          disabled={busy}
          onChange={(event) => {
            setKind(event.target.value === "filterset" ? "filterset" : "filter");
            setTarget("");
          }}
          className={CONTROL}
        >
          <option value="filter">{t("filtersets.composition.kindFilter")}</option>
          <option value="filterset">{t("filtersets.composition.kindFilterset")}</option>
        </select>
        <select
          aria-label={t("filtersets.composition.addTarget")}
          value={target}
          disabled={busy}
          onChange={(event) => {
            setTarget(event.target.value);
          }}
          className={`${CONTROL} min-w-0 flex-1`}
        >
          <option value="">{t("filtersets.composition.choose")}</option>
          {kind === "filter"
            ? filterOptions.map((row) => (
                <option key={row.id} value={String(row.id)}>
                  {row.f_label}
                </option>
              ))
            : filtersetOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
        </select>
        <button
          type="submit"
          disabled={busy || target === ""}
          className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {t("filtersets.composition.add")}
        </button>
      </form>

      {failure !== null && (
        <p role="alert" className="mt-2 text-state-down">
          ■ {failure}
        </p>
      )}
    </section>
  );
}
