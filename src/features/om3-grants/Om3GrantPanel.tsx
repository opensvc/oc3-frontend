import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { Combobox } from "@/components/ui/Combobox";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SlideOver } from "@/components/ui/SlideOver";
import { TrashIcon } from "@/components/ui/icons";
import {
  deleteOm3GrantRule,
  saveOm3GrantRule,
  useGrantClusters,
  useGrantTeams,
  type Om3GrantRule,
} from "./om3-grants-api";

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2 font-mono";
const FIELDSET = "flex flex-col gap-3 rounded-(--radius-panel) border border-line p-3";

/** The om3 grants a rule may give, offered as examples under the field. */
const EXAMPLES = ["root", "admin:*", "operator:prod*", "guest:*", "prioritizer", "squatter"];

interface Draft {
  groupId: string;
  /** Empty for every cluster. */
  clusterId: string;
  grants: string;
}

const EMPTY: Draft = { groupId: "", clusterId: "", grants: "" };

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint !== undefined && <div className="mt-1 text-ink-muted">{hint}</div>}
    </div>
  );
}

/** Creating or editing a rule giving om3 grants to a team, on a cluster or every cluster. */
export function Om3GrantPanel({
  open,
  rule,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** The rule to edit; absent, the form creates one. */
  rule?: Om3GrantRule;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const queryClient = useQueryClient();
  const editing = rule !== undefined;
  const teams = useGrantTeams();
  const clusters = useGrantClusters();
  const saved = useMemo<Draft>(
    () =>
      editing
        ? { groupId: String(rule.group_id), clusterId: rule.cluster_id, grants: rule.grants }
        : EMPTY,
    [editing, rule],
  );
  const [draft, setDraft] = useState<Draft>(EMPTY);
  useEffect(() => {
    if (open) setDraft(saved);
  }, [open, saved]);
  const unsaved = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = useMutation({
    mutationFn: () =>
      saveOm3GrantRule(rule?.id, {
        group_id: Number(draft.groupId),
        cluster_id: draft.clusterId,
        grants: draft.grants,
      }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["om3-grants"] });
      onSaved(saved.id);
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteOm3GrantRule(rule?.id ?? 0),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["om3-grants"] });
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  const teamName = editing ? rule.group_role : "";
  const everyCluster = t("om3Grants.everyCluster");

  return (
    <SlideOver
      closeOnOutsideClick={!unsaved}
      open={open}
      title={
        editing
          ? t("om3Grants.form.editTitle", { team: teamName })
          : t("om3Grants.form.createTitle")
      }
      onClose={onClose}
      closeLabel={t("detail.close")}
      resizeLabel={t("detail.resize")}
      leading={<ObjectIcon kind="cluster" />}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <fieldset className={FIELDSET}>
          <legend className="px-1 font-medium">{t("om3Grants.form.rule")}</legend>
          <Field
            id={`${id}-team`}
            label={t("om3Grants.fields.team")}
            hint={t("om3Grants.form.teamHint")}
          >
            <Combobox
              id={`${id}-team`}
              options={(teams.data ?? []).map((g) => ({ value: String(g.id), label: g.role }))}
              value={draft.groupId}
              onChange={(value) => {
                setDraft({ ...draft, groupId: value });
              }}
              label={t("om3Grants.fields.team")}
              placeholder={t("om3Grants.form.pickTeam")}
              emptyText={t("compEditor.noMatch")}
              className="w-full"
            />
          </Field>
          <Field
            id={`${id}-cluster`}
            label={t("om3Grants.fields.cluster")}
            hint={t("om3Grants.form.clusterHint")}
          >
            <Combobox
              id={`${id}-cluster`}
              options={[
                { value: "", label: everyCluster },
                ...(clusters.data ?? []).map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={draft.clusterId}
              onChange={(value) => {
                setDraft({ ...draft, clusterId: value });
              }}
              label={t("om3Grants.fields.cluster")}
              placeholder={everyCluster}
              emptyText={t("compEditor.noMatch")}
              className="w-full"
            />
          </Field>
          <Field
            id={`${id}-grants`}
            label={t("om3Grants.fields.grants")}
            hint={
              <>
                <p>{t("om3Grants.form.grantsHint")}</p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {EXAMPLES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        const current = draft.grants.split(/[\s,]+/).filter((s) => s !== "");
                        if (!current.includes(g))
                          setDraft({ ...draft, grants: [...current, g].join(" ") });
                      }}
                      className="rounded-(--radius-control) border border-line px-1.5 font-mono hover:bg-surface-sunken"
                    >
                      + {g}
                    </button>
                  ))}
                </p>
              </>
            }
          >
            <input
              id={`${id}-grants`}
              value={draft.grants}
              onChange={(event) => {
                setDraft({ ...draft, grants: event.target.value });
              }}
              placeholder="admin:prod guest:*"
              className={INPUT}
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
        </fieldset>

        {save.isError && (
          <p role="alert" className="text-state-down">
            ■ {save.error.message}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending || draft.groupId === "" || draft.grants.trim() === ""}
            className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
          >
            {save.isPending
              ? t("om3Grants.form.saving")
              : editing
                ? t("om3Grants.form.saveEdit")
                : t("om3Grants.form.saveCreate")}
          </button>
          {save.isSuccess && !save.isPending && (
            <span role="status" className="text-ink-muted">
              ✓ {t("om3Grants.form.saved")}
            </span>
          )}
        </div>
      </form>

      {editing && (
        <div className="mt-6 border-t border-line pt-4">
          {remove.isError && (
            <p role="alert" className="mb-2 text-state-down">
              ■ {remove.error.message}
            </p>
          )}
          <ConfirmButton
            label={t("om3Grants.form.delete")}
            question={t("om3Grants.form.deleteQuestion", { team: teamName })}
            confirmLabel={t("om3Grants.form.deleteConfirm")}
            cancelLabel={t("designer.cancel")}
            pendingLabel={t("om3Grants.form.deleting")}
            pending={remove.isPending}
            icon={<TrashIcon className="h-3.5 w-3.5" />}
            onConfirm={() => {
              remove.mutate();
            }}
          />
        </div>
      )}
    </SlideOver>
  );
}
