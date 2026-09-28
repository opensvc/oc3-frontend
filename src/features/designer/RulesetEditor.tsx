import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFiltersets } from "@/lib/api/filtersets";
import { Combobox } from "@/components/ui/Combobox";
import { MenuButton } from "@/components/ui/MenuButton";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Switch } from "@/components/ui/Switch";
import { FormRender } from "@/features/forms/FormRender";
import { FormValue } from "@/features/forms/FormValue";
import { useFormDefinitionByName } from "@/features/forms/use-form";
import { useFormUser } from "@/features/forms/use-form-user";
import { useDesigner } from "./designer-context";
import { useDraggable, useDropTarget, type DragItem } from "./drag";
import { EditorHeader, UsedBy } from "./editor-common";
import {
  inheritedVariables,
  type ObjectRef,
  type Operation,
  type Ruleset,
  type Variable,
} from "./model";
import { AddByName, InlineName, ObjectLink, ObjectPicker, Section, TeamsEditor } from "./parts";
import { BUTTON, SelectContext } from "./ui";
import { useDesignerFiltersets, useVariableClasses } from "./use-designer-data";

type CopyVariable = Extract<Operation, { op: "copyVariable" }>;

/** The editor of a ruleset of the draft, one section per aspect of it. */
export function RulesetEditor({
  ruleset,
  onSelect,
  onDeleted,
  onVariableDrop,
}: {
  ruleset: Ruleset;
  onSelect: (ref: ObjectRef) => void;
  onDeleted: () => void;
  onVariableDrop: (operation: CopyVariable, at: { x: number; y: number }) => void;
}) {
  const { t } = useTranslation();
  const ref: ObjectRef = { kind: "ruleset", id: ruleset.id };
  return (
    <div className="space-y-3">
      <EditorHeader refTo={ref} onSelect={onSelect} onDeleted={onDeleted} />
      <Properties ruleset={ruleset} />
      <Variables ruleset={ruleset} onVariableDrop={onVariableDrop} />
      <Includes ruleset={ruleset} />
      <Section title={t("designer.teams.title")}>
        <TeamsEditor refTo={ref} />
      </Section>
      <UsedBy refTo={ref} />
    </div>
  );
}

function Properties({ ruleset }: { ruleset: Ruleset }) {
  const { t } = useTranslation();
  const designer = useDesigner();
  const filtersets = useFiltersets();
  const all = useDesignerFiltersets();
  const select = useContext(SelectContext);
  // A filterset dropped here becomes the filterset of the ruleset, as in the list.
  const target = useDropTarget((item: DragItem): Operation | null =>
    item.type === "filterset" ? { op: "setFilterset", id: ruleset.id, filterset: item.name } : null,
  );
  const filtersetId = all.data?.find((f) => f.name === ruleset.filterset)?.id;
  return (
    <Section title={t("designer.properties")} target={target} hint={t("designer.propertiesHint")}>
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
        <span className="text-ink-muted">{t("designer.type")}</span>
        <div role="radiogroup" aria-label={t("designer.type")} className="flex flex-wrap gap-1">
          {(["explicit", "contextual"] as const).map((type) => (
            <label
              key={type}
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-(--radius-control) border border-line px-3 has-checked:border-accent has-checked:bg-accent-soft has-checked:text-ink"
            >
              <input
                type="radio"
                name={`type-${String(ruleset.id)}`}
                checked={ruleset.type === type}
                onChange={() => {
                  designer.runAndTell({ op: "setType", id: ruleset.id, type });
                }}
              />
              {t(`designer.types.${type}`)}
            </label>
          ))}
          <span className="self-center text-ink-muted">
            {t(`designer.typeHelp.${ruleset.type}`)}
          </span>
        </div>
        {ruleset.type === "contextual" && (
          <>
            <span className="text-ink-muted">{t("designer.filterset")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Combobox
                options={(filtersets.data ?? []).map((f) => ({ value: f, label: f }))}
                value={ruleset.filterset ?? ""}
                onChange={(filterset) => {
                  if (filterset !== "")
                    designer.runAndTell({ op: "setFilterset", id: ruleset.id, filterset });
                }}
                label={t("designer.filterset")}
                placeholder={t("designer.chooseFilterset")}
                emptyText={t("designer.noMatch")}
                className="w-64"
              />
              {filtersetId !== undefined && (
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => {
                    select({ kind: "filterset", id: filtersetId });
                  }}
                >
                  {t("designer.showFilterset")}
                </button>
              )}
              {ruleset.filterset !== null && (
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => {
                    designer.runAndTell({ op: "setFilterset", id: ruleset.id, filterset: null });
                  }}
                >
                  {t("designer.detach")}
                </button>
              )}
              {ruleset.filterset === null && (
                <span className="text-state-warn">▲ {t("designer.noFiltersetWarning")}</span>
              )}
            </div>
          </>
        )}
        <span className="text-ink-muted">{t("designer.public")}</span>
        <div className="flex items-center gap-2">
          <Switch
            checked={ruleset.isPublic}
            label={t("designer.public")}
            stateLabel={t(ruleset.isPublic ? "detail.yes" : "detail.no")}
            onChange={(isPublic) => {
              designer.runAndTell({ op: "setPublic", id: ruleset.id, isPublic });
            }}
          />
          <span className="text-ink-muted">
            {t(ruleset.isPublic ? "designer.publicHelp" : "designer.privateHelp")}
          </span>
        </div>
      </div>
    </Section>
  );
}

function Variables({
  ruleset,
  onVariableDrop,
}: {
  ruleset: Ruleset;
  onVariableDrop: (operation: CopyVariable, at: { x: number; y: number }) => void;
}) {
  const { t } = useTranslation();
  const designer = useDesigner();
  const classes = useVariableClasses();
  const [varClass, setVarClass] = useState("raw");
  const [editing, setEditing] = useState<number | null>(null);
  const target = useDropTarget(
    (item: DragItem): Operation | null =>
      item.type === "variable" && item.rulesetId !== ruleset.id
        ? {
            op: "copyVariable",
            fromId: item.rulesetId,
            variableId: item.variableId,
            toId: ruleset.id,
            move: false,
          }
        : null,
    (operation, _item, at) => {
      if (operation.op === "copyVariable") onVariableDrop(operation, at);
    },
  );
  const inherited = inheritedVariables(designer.draft, ruleset.id);
  return (
    <Section
      title={t("designer.variables")}
      count={ruleset.variables.length}
      target={target}
      hint={t("designer.variablesHint")}
    >
      <div className="space-y-2">
        {ruleset.variables.length === 0 && (
          <p className="text-ink-muted">{t("designer.noVariable")}</p>
        )}
        {ruleset.variables.map((variable) => (
          <VariableCard
            key={variable.id}
            ruleset={ruleset}
            variable={variable}
            editing={editing === variable.id}
            onEdit={(on) => {
              setEditing(on ? variable.id : null);
            }}
          />
        ))}
        <AddByName
          label={t("designer.addVariable")}
          placeholder={t("designer.variableName")}
          onAdd={(name) => {
            const { refused } = designer.run({
              op: "addVariable",
              rulesetId: ruleset.id,
              name,
              varClass,
              value: "",
            });
            if (refused === null) {
              designer.notify({
                key: "designer.log.addVariable",
                values: { name: name.trim(), ruleset: ruleset.name },
                tone: "done",
              });
              // The new variable is the last one: open its form to give it a value.
              setEditing(designer.draft.nextId);
            }
            return refused;
          }}
        >
          <Combobox
            options={(classes.data ?? []).map((c) => ({ value: c, label: c }))}
            value={varClass}
            onChange={(c) => {
              if (c !== "") setVarClass(c);
            }}
            label={t("designer.variableClass")}
            placeholder={t("designer.variableClass")}
            emptyText={t("designer.noMatch")}
            className="w-44"
          />
        </AddByName>
        {inherited.length > 0 && (
          <details className="rounded-(--radius-control) border border-line p-2">
            <summary className="cursor-pointer text-ink-muted">
              {t("designer.inherited", { count: inherited.length })}
            </summary>
            <ul className="mt-2 space-y-2">
              {inherited.map(({ from, chain, variable }) => (
                <li
                  key={`${String(from.id)}:${String(variable.id)}:${chain.join(">")}`}
                  className="opacity-90"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{variable.name}</span>
                    <span className="rounded-full border border-line px-1.5 text-ink-muted">
                      {variable.varClass}
                    </span>
                    <span className="text-ink-muted">{t("designer.from")}</span>
                    <ObjectLink refTo={{ kind: "ruleset", id: from.id }} />
                    {chain.length > 2 && (
                      <span className="text-ink-muted">({chain.join(" › ")})</span>
                    )}
                  </div>
                  <FormValue formName={variable.varClass} value={variable.value} digest />
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Section>
  );
}

function VariableCard({
  ruleset,
  variable,
  editing,
  onEdit,
}: {
  ruleset: Ruleset;
  variable: Variable;
  editing: boolean;
  onEdit: (on: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const designer = useDesigner();
  const classes = useVariableClasses();
  const [mode, setMode] = useState<"class" | "copy" | "move" | null>(null);
  const drag = useDraggable(
    { type: "variable", rulesetId: ruleset.id, variableId: variable.id },
    variable.name,
  );
  return (
    <article className="rounded-(--radius-control) border border-line p-2">
      <div
        className="flex flex-wrap items-center gap-2"
        {...drag}
        title={t("designer.variableDragHint")}
      >
        <span className="cursor-grab text-ink-muted" aria-hidden="true">
          ⠿
        </span>
        <InlineName
          value={variable.name}
          label={variable.name}
          className="font-medium"
          onCommit={(name) =>
            designer.run({
              op: "updateVariable",
              rulesetId: ruleset.id,
              variableId: variable.id,
              patch: { name },
            }).refused
          }
        />
        <span className="rounded-full border border-line px-1.5 text-ink-muted">
          {variable.varClass}
        </span>
        <span className="text-ink-muted">
          {variable.author.trim() || "?"},
          <RelativeTime value={variable.updated} locale={i18n.language} />
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-pressed={editing}
            className={`${BUTTON} aria-pressed:bg-accent-soft aria-pressed:text-ink`}
            onClick={() => {
              onEdit(!editing);
            }}
          >
            {t("designer.edit")}
          </button>
          <MenuButton
            label={t("designer.actions")}
            items={[
              {
                key: "class",
                label: t("designer.changeClass"),
                onSelect: () => {
                  setMode("class");
                },
              },
              {
                key: "copy",
                label: t("designer.copyTo"),
                onSelect: () => {
                  setMode("copy");
                },
              },
              {
                key: "move",
                label: t("designer.moveTo"),
                onSelect: () => {
                  setMode("move");
                },
              },
              {
                key: "delete",
                label: t("designer.delete"),
                separatorBefore: true,
                onSelect: () => {
                  designer.runAndTell({
                    op: "deleteVariable",
                    rulesetId: ruleset.id,
                    variableId: variable.id,
                  });
                },
              },
            ]}
          />
        </div>
      </div>
      {mode !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {mode === "class" ? (
            <Combobox
              options={(classes.data ?? []).map((c) => ({ value: c, label: c }))}
              value=""
              onChange={(varClass) => {
                if (varClass === "") return;
                designer.runAndTell({
                  op: "updateVariable",
                  rulesetId: ruleset.id,
                  variableId: variable.id,
                  patch: { varClass },
                });
                setMode(null);
              }}
              label={t("designer.changeClass")}
              placeholder={t("designer.changeClass")}
              emptyText={t("designer.noMatch")}
              className="w-56"
            />
          ) : (
            <ObjectPicker
              kind="ruleset"
              label={t(mode === "copy" ? "designer.copyTo" : "designer.moveTo")}
              exclude={[ruleset.id]}
              onPick={(toId) => {
                designer.runAndTell({
                  op: "copyVariable",
                  fromId: ruleset.id,
                  variableId: variable.id,
                  toId,
                  move: mode === "move",
                });
                setMode(null);
              }}
            />
          )}
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              setMode(null);
            }}
          >
            {t("designer.cancel")}
          </button>
        </div>
      )}
      <div className="mt-1">
        {editing ? (
          <VariableForm
            variable={variable}
            onDone={(value) => {
              if (value !== undefined)
                designer.runAndTell({
                  op: "updateVariable",
                  rulesetId: ruleset.id,
                  variableId: variable.id,
                  patch: { value },
                });
              onEdit(false);
            }}
          />
        ) : variable.value === "" ? (
          <p className="text-ink-muted">{t("designer.emptyValue")}</p>
        ) : (
          <FormValue formName={variable.varClass} value={variable.value} digest />
        )}
      </div>
    </article>
  );
}

/** The form of a variable's class, filled with its value; the value it produces on submit. */
function VariableForm({
  variable,
  onDone,
}: {
  variable: Variable;
  onDone: (value?: string) => void;
}) {
  const { t } = useTranslation();
  const form = useFormDefinitionByName(variable.varClass);
  const user = useFormUser();
  if (form.isPending || user.isPending) return <p className="text-ink-muted">…</p>;
  if (form.isError) return <p className="text-state-down">■ {form.error.message}</p>;
  if (form.data === null || form.data === undefined || user.data === undefined)
    return <p className="text-state-down">■ {t("forms.display.notFound")}</p>;
  let initial: unknown;
  try {
    initial = variable.value === "" ? undefined : (JSON.parse(variable.value) as unknown);
  } catch {
    initial = variable.value;
  }
  return (
    <div className="rounded-(--radius-control) border border-accent p-2">
      <FormRender
        def={form.data}
        user={user.data}
        initialData={initial}
        submitLabel={t("designer.applyToDraft")}
        onSubmit={(data) => {
          onDone(typeof data === "string" ? data : JSON.stringify(data));
        }}
      />
      <button
        type="button"
        className={`${BUTTON} mt-2`}
        onClick={() => {
          onDone();
        }}
      >
        {t("designer.cancel")}
      </button>
    </div>
  );
}

function Includes({ ruleset }: { ruleset: Ruleset }) {
  const { t } = useTranslation();
  const designer = useDesigner();
  const ref: ObjectRef = { kind: "ruleset", id: ruleset.id };
  const target = useDropTarget((item: DragItem): Operation | null =>
    item.type === "ruleset"
      ? { op: "include", parent: ref, child: { kind: "ruleset", id: item.id } }
      : null,
  );
  return (
    <Section
      title={t("designer.includes")}
      count={ruleset.rulesets.length}
      target={target}
      hint={t("designer.includesHint")}
      actions={
        <ObjectPicker
          kind="ruleset"
          label={t("designer.includeRuleset")}
          exclude={[ruleset.id, ...ruleset.rulesets]}
          onPick={(id) => {
            designer.runAndTell({ op: "include", parent: ref, child: { kind: "ruleset", id } });
          }}
        />
      }
    >
      <ChildList parent={ref} kind="ruleset" ids={ruleset.rulesets} />
    </Section>
  );
}

/** The objects a ruleset or moduleset includes, each with its Detach button. */
export function ChildList({
  parent,
  kind,
  ids,
}: {
  parent: ObjectRef;
  kind: "ruleset" | "moduleset";
  ids: number[];
}) {
  const { t } = useTranslation();
  const designer = useDesigner();
  if (ids.length === 0) return <p className="text-ink-muted">{t("designer.none")}</p>;
  return (
    <ul className="space-y-1">
      {ids.map((id) => {
        const child =
          kind === "ruleset" ? designer.draft.rulesets[id] : designer.draft.modulesets[id];
        if (child === undefined) return null;
        return (
          <li key={id} className="flex items-center gap-2">
            <ObjectLink
              refTo={{ kind, id }}
              suffix={
                <span className="text-ink-muted">
                  {child.kind === "ruleset"
                    ? t("designer.count.variables", { count: child.variables.length })
                    : t("designer.count.modules", { count: child.modules.length })}
                </span>
              }
            />
            <button
              type="button"
              className={`${BUTTON} ml-auto`}
              onClick={() => {
                designer.runAndTell({ op: "detach", parent, child: { kind, id } });
              }}
            >
              {t("designer.detach")}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
