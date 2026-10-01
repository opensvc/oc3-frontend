import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { Combobox } from "@/components/ui/Combobox";
import { Switch } from "@/components/ui/Switch";
import { DateTime } from "@/components/ui/DateTime";
import {
  AlertTriangleIcon,
  CheckIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { useComplianceGroups } from "@/features/designer/use-designer-data";
import { UserLink } from "@/features/users/UserLink";
import {
  useCompObjects,
  useModuleset,
  useModulesetChanged,
  useModulesetResponsible,
  useModulesetUsage,
  type CompObject,
  type ModulesetDetail,
} from "./use-moduleset";

type ModulesetRow = components["schemas"]["ModulesetRow"];

const text = (prop: keyof ModulesetRow) => (row: ModulesetRow) => {
  const value = row[prop];
  return value === undefined || value === "" ? undefined : String(value);
};

const GROUPS: DetailGroup<ModulesetRow>[] = [
  {
    key: "identity",
    family: "moduleset",
    fields: [{ prop: "modset_name", format: text("modset_name"), editable: true }],
  },
  {
    key: "record",
    family: "time",
    fields: [
      {
        prop: "modset_author",
        format: text("modset_author"),
        render: (row) => <UserLink name={row.modset_author} />,
      },
      {
        prop: "modset_updated",
        format: text("modset_updated"),
        render: (row, locale) => <DateTime value={row.modset_updated} locale={locale} />,
      },
      { prop: "id", format: text("id") },
    ],
  },
];

const BUTTON =
  "inline-flex h-7 items-center gap-1 rounded-(--radius-control) border border-line bg-surface px-2 text-ink-muted hover:border-line-strong hover:text-ink disabled:opacity-40";

/** The outcome of the last change, told under the panel title. */
interface Outcome {
  tone: "done" | "refused";
  text: string;
}

/** What the API calls of the editor answer: an error, or nothing. */
type Call = () => Promise<{ error?: unknown }>;

/**
 * A moduleset: its name and record, its modules with their autofix flag, the
 * rulesets attached to it, the modulesets it includes, its teams and the nodes
 * and services using it. A responsible with the CompManager privilege edits all
 * of it in place, each change written to the collector at once, as the
 * historical moduleset editor does; the others read it, and the server refuses a
 * responsible without the privilege with its message.
 */
export function ModulesetDetailPanel({
  modsetId,
  label,
  onClose,
}: {
  modsetId: string | undefined;
  label: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const detail = useModuleset(modsetId);
  const responsible = useModulesetResponsible(modsetId);
  const editable = responsible.data === true;
  const changed = useModulesetChanged();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  /** Runs a change, tells its outcome, and reloads what it touched. */
  async function change(done: string, call: Call): Promise<string | null> {
    if (modsetId === undefined) return null;
    setBusy(true);
    try {
      const { error } = await call();
      if (error !== undefined) {
        const message = problemText(error);
        setOutcome({ tone: "refused", text: message });
        return message;
      }
      setOutcome({ tone: "done", text: done });
      await changed(modsetId);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const name = detail.data?.name ?? "";
  return (
    <DetailPanel
      kind="moduleset"
      open={modsetId !== undefined}
      recordId={modsetId}
      title={name !== "" ? name : label === "" ? t("modulesets.detail.title") : label}
      onClose={() => {
        setOutcome(null);
        onClose();
      }}
      groups={GROUPS}
      row={detail.data?.row ?? (detail.data === null ? null : undefined)}
      labelPrefix="modulesets.detail.fields"
      groupPrefix="modulesets.detail.groups"
      isPending={detail.isPending}
      errorMessage={
        detail.isError
          ? detail.error.message
          : detail.data === null
            ? t("modulesets.detail.notFound")
            : null
      }
      editHint={t("modulesets.detail.editHint")}
      onSave={
        editable
          ? async (changes) => {
              const next = changes.modset_name;
              if (typeof next !== "string" || modsetId === undefined) return;
              const refused = await change(t("modulesets.detail.renamed", { name: next }), () =>
                api.POST("/compliance/modulesets/{modset_id}", {
                  params: { path: { modset_id: modsetId } },
                  body: { modset_name: next.trim() },
                }),
              );
              if (refused !== null) throw new Error(refused);
            }
          : undefined
      }
      actions={
        detail.data !== undefined && detail.data !== null && modsetId !== undefined ? (
          <ModulesetContent
            modsetId={modsetId}
            detail={detail.data}
            editable={editable}
            busy={busy}
            outcome={outcome}
            onDismiss={() => {
              setOutcome(null);
            }}
            change={change}
          />
        ) : undefined
      }
    />
  );
}

function ModulesetContent({
  modsetId,
  detail,
  editable,
  busy,
  outcome,
  onDismiss,
  change,
}: {
  modsetId: string;
  detail: ModulesetDetail;
  editable: boolean;
  busy: boolean;
  outcome: Outcome | null;
  onDismiss: () => void;
  change: (done: string, call: Call) => Promise<string | null>;
}) {
  const { t, i18n } = useTranslation();
  const rulesets = useCompObjects("ruleset");
  const modulesets = useCompObjects("moduleset");
  const groups = useComplianceGroups();
  const path = { modset_id: modsetId };
  const idOf = (list: CompObject[] | undefined, name: string) =>
    list?.find((o) => o.name === name)?.id;

  return (
    <div className="space-y-3">
      {!editable && <p className="text-ink-muted">{t("modulesets.detail.readOnly")}</p>}
      <div aria-live="polite">
        {outcome !== null && (
          <p
            role={outcome.tone === "refused" ? "alert" : "status"}
            className={`flex items-start gap-1.5 rounded-(--radius-control) border px-2 py-1 ${
              outcome.tone === "refused"
                ? "border-state-down bg-state-down-soft"
                : "border-state-up bg-state-up-soft"
            }`}
          >
            {outcome.tone === "refused" ? (
              <AlertTriangleIcon className="mt-0.5 shrink-0 text-state-down" />
            ) : (
              <CheckIcon className="mt-0.5 shrink-0 text-state-up" />
            )}
            <span className="min-w-0 flex-1">{outcome.text}</span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t("detail.close")}
              title={t("detail.close")}
              className="rounded-(--radius-control) p-0.5 text-ink-muted hover:text-ink"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </p>
        )}
      </div>

      <Part title={t("modulesets.detail.modules")} count={detail.modules.length}>
        <p className="mb-2 text-ink-muted">{t("modulesets.detail.modulesHint")}</p>
        {detail.modules.length === 0 ? (
          <p className="mb-2 text-ink-muted">{t("modulesets.detail.noModule")}</p>
        ) : (
          <table className="mb-2 w-full">
            <thead>
              <tr className="text-left text-ink-muted">
                <th className="py-1 pr-3 font-normal">{t("modulesets.fields.modset_mod_name")}</th>
                <th className="py-1 pr-3 font-normal">{t("modulesets.fields.autofix")}</th>
                <th className="py-1 pr-3 font-normal">
                  {t("modulesets.fields.modset_mod_updated")}
                </th>
                {editable && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {detail.modules.map((mod) => (
                <tr key={mod.id} className="border-t border-line">
                  <td className="py-1 pr-3">
                    <InlineName
                      value={mod.name}
                      editable={editable}
                      label={t("modulesets.detail.renameModule", { name: mod.name })}
                      onCommit={(next) =>
                        change(t("modulesets.detail.moduleRenamed", { name: next }), () =>
                          api.POST("/compliance/modulesets/{modset_id}/modules/{mod_id}", {
                            params: { path: { ...path, mod_id: String(mod.id) } },
                            body: { modset_mod_name: next },
                          }),
                        )
                      }
                    />
                  </td>
                  <td className="py-1 pr-3">
                    <Switch
                      checked={mod.autofix}
                      disabled={!editable || busy}
                      label={t("modulesets.detail.autofixOf", { name: mod.name })}
                      stateLabel={t(mod.autofix ? "detail.yes" : "detail.no")}
                      onChange={(autofix) => {
                        void change(
                          t(
                            autofix
                              ? "modulesets.detail.autofixOn"
                              : "modulesets.detail.autofixOff",
                            {
                              name: mod.name,
                            },
                          ),
                          () =>
                            api.POST("/compliance/modulesets/{modset_id}/modules/{mod_id}", {
                              params: { path: { ...path, mod_id: String(mod.id) } },
                              body: { autofix },
                            }),
                        );
                      }}
                    />
                  </td>
                  <td className="py-1 pr-3 whitespace-nowrap text-ink-muted">
                    <DateTime value={mod.updated} locale={i18n.language} />
                  </td>
                  {editable && (
                    <td className="py-1 text-right">
                      <RemoveButton
                        label={t("modulesets.detail.removeModule", { name: mod.name })}
                        disabled={busy}
                        onClick={() => {
                          void change(
                            t("modulesets.detail.moduleRemoved", { name: mod.name }),
                            () =>
                              api.DELETE("/compliance/modulesets/{modset_id}/modules/{mod_id}", {
                                params: { path: { ...path, mod_id: String(mod.id) } },
                              }),
                          );
                        }}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {editable && (
          <AddModule
            disabled={busy}
            onAdd={(next) =>
              change(t("modulesets.detail.moduleAdded", { name: next }), () =>
                api.POST("/compliance/modulesets/{modset_id}/modules", {
                  params: { path },
                  body: { modset_mod_name: next, autofix: false },
                }),
              )
            }
          />
        )}
      </Part>

      <Part
        title={t("modulesets.detail.rulesets")}
        count={detail.rulesets.length}
        actions={
          editable && (
            <Combobox
              options={(rulesets.data ?? [])
                .filter((r) => !detail.rulesets.includes(r.name))
                .map((r) => ({ value: String(r.id), label: r.name }))}
              value=""
              onChange={(id) => {
                const picked = rulesets.data?.find((r) => String(r.id) === id);
                if (picked === undefined) return;
                void change(t("modulesets.detail.rulesetAttached", { name: picked.name }), () =>
                  api.POST("/compliance/modulesets/{modset_id}/rulesets/{rset_id}", {
                    params: { path: { ...path, rset_id: id } },
                  }),
                );
              }}
              label={t("modulesets.detail.attachRuleset")}
              placeholder={t("modulesets.detail.attachRuleset")}
              emptyText={t("modulesets.detail.noMatch")}
              className="w-56"
            />
          )
        }
      >
        <Chips
          kind="ruleset"
          names={detail.rulesets}
          empty={t("modulesets.detail.noRuleset")}
          removeLabel={(n) => t("modulesets.detail.detachRuleset", { name: n })}
          onRemove={
            editable && !busy
              ? (n) => {
                  const id = idOf(rulesets.data, n);
                  void change(t("modulesets.detail.rulesetDetached", { name: n }), () =>
                    api.DELETE("/compliance/modulesets/{modset_id}/rulesets/{rset_id}", {
                      params: { path: { ...path, rset_id: id === undefined ? n : String(id) } },
                    }),
                  );
                }
              : undefined
          }
        />
      </Part>

      <Part
        title={t("modulesets.detail.modulesets")}
        count={detail.modulesets.length}
        actions={
          editable && (
            <Combobox
              options={(modulesets.data ?? [])
                .filter((m) => m.name !== detail.name && !detail.modulesets.includes(m.name))
                .map((m) => ({ value: String(m.id), label: m.name }))}
              value=""
              onChange={(id) => {
                const picked = modulesets.data?.find((m) => String(m.id) === id);
                if (picked === undefined) return;
                void change(t("modulesets.detail.modulesetIncluded", { name: picked.name }), () =>
                  api.POST("/compliance/modulesets/{modset_id}/modulesets/{child_modset_id}", {
                    params: { path: { ...path, child_modset_id: id } },
                  }),
                );
              }}
              label={t("modulesets.detail.includeModuleset")}
              placeholder={t("modulesets.detail.includeModuleset")}
              emptyText={t("modulesets.detail.noMatch")}
              className="w-56"
            />
          )
        }
      >
        <Chips
          kind="moduleset"
          names={detail.modulesets}
          linkId={(n) => {
            const id = idOf(modulesets.data, n);
            return id === undefined ? undefined : String(id);
          }}
          empty={t("modulesets.detail.noModuleset")}
          removeLabel={(n) => t("modulesets.detail.excludeModuleset", { name: n })}
          onRemove={
            editable && !busy
              ? (n) => {
                  const id = idOf(modulesets.data, n);
                  void change(t("modulesets.detail.modulesetExcluded", { name: n }), () =>
                    api.DELETE("/compliance/modulesets/{modset_id}/modulesets/{child_modset_id}", {
                      params: {
                        path: { ...path, child_modset_id: id === undefined ? n : String(id) },
                      },
                    }),
                  );
                }
              : undefined
          }
        />
      </Part>

      <Part title={t("modulesets.detail.teams")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["responsibles", "publications"] as const).map((role) => {
            const teams = detail[role];
            const list = t(`modulesets.detail.${role}`);
            const groupId = (team: string) =>
              String(groups.data?.find((g) => g.role === team)?.id ?? team);
            return (
              <div key={role} className="rounded-(--radius-control) border border-line p-2">
                <p className="mb-1 font-medium">{list}</p>
                <Chips
                  kind="group"
                  names={teams}
                  linkId={(team) => {
                    const id = groups.data?.find((g) => g.role === team)?.id;
                    return id === undefined ? undefined : String(id);
                  }}
                  empty={t("modulesets.detail.noTeam")}
                  removeLabel={(team) => t("modulesets.detail.removeTeam", { team, list })}
                  onRemove={
                    editable && !busy
                      ? (team) => {
                          void change(t("modulesets.detail.teamRemoved", { team, list }), () =>
                            role === "responsibles"
                              ? api.DELETE(
                                  "/compliance/modulesets/{modset_id}/responsibles/{group_id}",
                                  {
                                    params: { path: { ...path, group_id: groupId(team) } },
                                  },
                                )
                              : api.DELETE(
                                  "/compliance/modulesets/{modset_id}/publications/{group_id}",
                                  {
                                    params: { path: { ...path, group_id: groupId(team) } },
                                  },
                                ),
                          );
                        }
                      : undefined
                  }
                />
                {editable && (
                  <div className="mt-2">
                    <Combobox
                      options={(groups.data ?? [])
                        .filter((g) => !teams.includes(g.role))
                        .map((g) => ({ value: String(g.id), label: g.role }))}
                      value=""
                      onChange={(id) => {
                        const team = groups.data?.find((g) => String(g.id) === id)?.role;
                        if (team === undefined) return;
                        void change(t("modulesets.detail.teamAdded", { team, list }), () =>
                          role === "responsibles"
                            ? api.POST(
                                "/compliance/modulesets/{modset_id}/responsibles/{group_id}",
                                {
                                  params: { path: { ...path, group_id: id } },
                                },
                              )
                            : api.POST(
                                "/compliance/modulesets/{modset_id}/publications/{group_id}",
                                {
                                  params: { path: { ...path, group_id: id } },
                                },
                              ),
                        );
                      }}
                      label={t("modulesets.detail.addTeam", { list })}
                      placeholder={t("modulesets.detail.addTeam", { list })}
                      emptyText={t("modulesets.detail.noMatch")}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Part>

      <UsedBy modsetId={modsetId} />
    </div>
  );
}

/** A part of the panel: a heading with a count, its actions, its content. */
function Part({
  title,
  count,
  actions,
  children,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-(--radius-panel) border border-line bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">
          {title}
          {count !== undefined && (
            <span className="ml-1 font-normal text-ink-muted">({count})</span>
          )}
        </h3>
        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

/** Objects named in a list of chips, each removable when `onRemove` is given. */
function Chips({
  kind,
  names,
  linkId,
  empty,
  removeLabel,
  onRemove,
}: {
  kind: "ruleset" | "moduleset" | "group";
  names: string[];
  /** Id of the record a chip opens, when one can be opened. */
  linkId?: (name: string) => string | undefined;
  empty: string;
  removeLabel: (name: string) => string;
  onRemove?: (name: string) => void;
}) {
  if (names.length === 0) return <p className="text-ink-muted">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-1">
      {names.map((name) => {
        const id = linkId?.(name);
        return (
          <li key={name} className="inline-flex items-center gap-0.5">
            {id !== undefined && kind !== "ruleset" ? (
              <CrossLink kind={kind} id={id}>
                {name}
              </CrossLink>
            ) : (
              // A ruleset has no record panel yet: its name only.
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-1.5 text-data">
                <ObjectIcon kind={kind} className="h-3.5 w-3.5 shrink-0" />
                {name}
              </span>
            )}
            {onRemove !== undefined && (
              <RemoveButton
                label={removeLabel(name)}
                round
                onClick={() => {
                  onRemove(name);
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RemoveButton({
  label,
  onClick,
  disabled = false,
  round = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  round?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`${round ? "rounded-full" : "rounded-(--radius-control)"} p-0.5 text-ink-muted hover:bg-surface-sunken hover:text-state-down disabled:opacity-40`}
    >
      <CloseIcon className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * A name shown as text, turned into a field by its pencil: Enter keeps the new
 * name, Escape gives it up. A refused name keeps the field open with the reason.
 */
function InlineName({
  value,
  label,
  editable,
  onCommit,
}: {
  value: string;
  label: string;
  editable: boolean;
  onCommit: (name: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (editing === null)
    return (
      <span className="group inline-flex items-center gap-1">
        <span>{value}</span>
        {editable && (
          <button
            type="button"
            title={label}
            aria-label={label}
            onClick={() => {
              setEditing(value);
              setError(null);
            }}
            className="rounded-(--radius-control) p-0.5 text-ink-muted opacity-60 group-hover:opacity-100 hover:text-ink focus:opacity-100"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    );
  const commit = async () => {
    const next = editing.trim();
    if (next === value || next === "") {
      setEditing(null);
      return;
    }
    const refused = await onCommit(next);
    if (refused === null) setEditing(null);
    else setError(refused);
  };
  return (
    <span className="inline-flex flex-col">
      <input
        autoFocus
        aria-label={label}
        value={editing}
        onChange={(event) => {
          setEditing(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") void commit();
          if (event.key === "Escape") {
            // The panel closes on Escape: here it only gives the edit up.
            event.stopPropagation();
            setEditing(null);
          }
        }}
        onBlur={() => {
          void commit();
        }}
        className="h-7 rounded-(--radius-control) border border-accent bg-surface px-2"
      />
      {error !== null && (
        <span className="flex items-center gap-1 text-state-down">
          <AlertTriangleIcon className="shrink-0" />
          {error}
        </span>
      )}
    </span>
  );
}

/** The field and the button adding a module by its name. */
function AddModule({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (name: string) => Promise<string | null>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = name.trim();
    if (next === "") return;
    if ((await onAdd(next)) === null) setName("");
  }
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => void submit(event)}>
      <input
        aria-label={t("modulesets.detail.moduleName")}
        placeholder={t("modulesets.detail.moduleName")}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        className="h-7 w-56 rounded-(--radius-control) border border-line bg-surface px-2"
      />
      <button type="submit" disabled={disabled || name.trim() === ""} className={BUTTON}>
        <PlusIcon className="h-3.5 w-3.5" />
        {t("modulesets.detail.addModule")}
      </button>
    </form>
  );
}

/** The nodes and services the moduleset is attached to. */
function UsedBy({ modsetId }: { modsetId: string }) {
  const { t } = useTranslation();
  const usage = useModulesetUsage(modsetId);
  const nodes = usage.data?.nodes ?? [];
  const services = usage.data?.services ?? [];
  return (
    <Part title={t("modulesets.detail.usedBy")}>
      {usage.isError && (
        <p role="alert" className="flex items-center gap-1 text-state-down">
          <AlertTriangleIcon className="shrink-0" />
          {usage.error.message}
        </p>
      )}
      {usage.isSuccess && nodes.length === 0 && services.length === 0 && (
        <p className="text-ink-muted">{t("modulesets.detail.unused")}</p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {nodes.length > 0 && (
          <>
            <dt className="text-ink-muted">
              {t("modulesets.detail.nodes", { count: nodes.length })}
            </dt>
            <dd className="flex flex-wrap gap-1">
              {nodes.map((n) => (
                <CrossLink key={n.id} kind="node" id={n.id}>
                  {n.name}
                </CrossLink>
              ))}
            </dd>
          </>
        )}
        {services.length > 0 && (
          <>
            <dt className="text-ink-muted">
              {t("modulesets.detail.services", { count: services.length })}
            </dt>
            <dd className="flex flex-wrap gap-1">
              {services.map((s) => (
                <CrossLink key={s.id} kind="service" id={s.id}>
                  {s.name}
                </CrossLink>
              ))}
            </dd>
          </>
        )}
      </dl>
    </Part>
  );
}
