import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { SlideOver } from "@/components/ui/SlideOver";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";

type MetricRow = components["schemas"]["MetricRow"];

/** The metric as the form holds it: the indexes as typed, empty for none. */
interface Draft {
  name: string;
  sql: string;
  valueIndex: string;
  instanceIndex: string;
  instanceLabel: string;
  historize: boolean;
}

const EMPTY: Draft = {
  name: "",
  sql: "",
  valueIndex: "0",
  instanceIndex: "",
  instanceLabel: "",
  historize: false,
};

function fromRow(row: MetricRow | null | undefined): Draft {
  if (row === null || row === undefined) return EMPTY;
  const index = (value: number | null | undefined) =>
    value === null || value === undefined ? "" : String(value);
  return {
    name: row.metric_name ?? "",
    sql: row.metric_sql ?? "",
    valueIndex: index(row.metric_col_value_index) || "0",
    instanceIndex: index(row.metric_col_instance_index),
    instanceLabel: row.metric_col_instance_label ?? "",
    historize: row.metric_historize === "T",
  };
}

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2";

/**
 * Creating or editing a metric, in a single form: its name, the SQL request that
 * computes it, which columns of the result hold the value and the name of each
 * instance, and whether the values are kept over time for the charts.
 *
 * The request is stored as typed: the collector runs it later, for the charts and,
 * when the metric is historized, every day. The server checks the name — required,
 * unique — and the indexes; its refusals are shown as they are, a missing Manager
 * privilege included.
 */
export function MetricFormPanel({
  open,
  metric,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Metric to edit; absent, the form creates one. */
  metric?: MetricRow | null;
  onClose: () => void;
  onSaved?: (id: number | undefined) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const editing = metric !== undefined && metric !== null;
  const [draft, setDraft] = useState<Draft>(fromRow(metric));

  // Every opening starts again from the metric to edit, or from an empty form.
  useEffect(() => {
    if (open) setDraft(fromRow(metric));
  }, [open, metric]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        metric_name: draft.name.trim(),
        metric_sql: draft.sql,
        metric_col_value_index: Number(draft.valueIndex),
        // Empty: the request returns a single value, without instances.
        metric_col_instance_index: draft.instanceIndex === "" ? null : Number(draft.instanceIndex),
        metric_col_instance_label: draft.instanceLabel,
        metric_historize: draft.historize ? ("T" as const) : ("F" as const),
      };
      if (editing) {
        const { data, error } = await api.POST("/metrics/{metric_id}", {
          params: { path: { metric_id: String(metric.id) } },
          body,
        });
        if (error !== undefined) throw new Error(problemText(error));
        return Array.isArray(data.data) ? data.data[0]?.id : undefined;
      }
      const { data, error } = await api.POST("/metrics", { body });
      if (error !== undefined) throw new Error(problemText(error));
      return Array.isArray(data.data) ? data.data[0]?.id : undefined;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["metrics"] });
      await queryClient.invalidateQueries({ queryKey: ["metric"] });
      onSaved?.(id);
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  const prefix = editing ? "edit-metric" : "create-metric";

  return (
    <SlideOver
      // Created like the other objects, closing on a click beside it; an existing one
      // being edited is not dropped by a stray click.
      closeOnOutsideClick={!editing}
      open={open}
      size="wide"
      title={editing ? t("metrics.form.editTitle") : t("metrics.form.createTitle")}
      onClose={onClose}
      closeLabel={t("detail.close")}
      resizeLabel={t("detail.resize")}
      leading={<ObjectIcon kind="metric" />}
    >
      <p className="mb-3 text-ink-muted">
        {editing ? t("metrics.form.editIntro") : t("metrics.form.createIntro")}
      </p>

      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor={`${prefix}-name`}>
            {t("metrics.fields.metric_name")}
          </label>
          <input
            id={`${prefix}-name`}
            required
            maxLength={100}
            value={draft.name}
            onChange={(event) => {
              set("name", event.target.value);
            }}
            className={INPUT}
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor={`${prefix}-sql`}>
            {t("metrics.fields.metric_sql")}
          </label>
          <textarea
            id={`${prefix}-sql`}
            rows={8}
            spellCheck={false}
            value={draft.sql}
            onChange={(event) => {
              set("sql", event.target.value);
            }}
            placeholder={t("metrics.form.sqlPlaceholder")}
            aria-describedby={`${prefix}-sql-hint`}
            className="w-full rounded-(--radius-control) border border-line bg-surface p-2 font-mono text-data"
          />
          <p id={`${prefix}-sql-hint`} className="mt-1 text-ink-muted">
            {t("metrics.form.sqlHint")}
          </p>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium" htmlFor={`${prefix}-value-index`}>
              {t("metrics.fields.metric_col_value_index")}
            </label>
            <input
              id={`${prefix}-value-index`}
              type="number"
              required
              min={0}
              step={1}
              value={draft.valueIndex}
              onChange={(event) => {
                set("valueIndex", event.target.value);
              }}
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium" htmlFor={`${prefix}-instance-index`}>
              {t("metrics.fields.metric_col_instance_index")}
            </label>
            <input
              id={`${prefix}-instance-index`}
              type="number"
              min={0}
              step={1}
              value={draft.instanceIndex}
              onChange={(event) => {
                set("instanceIndex", event.target.value);
              }}
              placeholder={t("metrics.form.noInstance")}
              className={INPUT}
            />
          </div>
        </div>
        <p className="-mt-1 mb-3 text-ink-muted">{t("metrics.form.indexHint")}</p>

        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor={`${prefix}-instance-label`}>
            {t("metrics.fields.metric_col_instance_label")}
          </label>
          <input
            id={`${prefix}-instance-label`}
            maxLength={100}
            value={draft.instanceLabel}
            onChange={(event) => {
              set("instanceLabel", event.target.value);
            }}
            className={INPUT}
          />
        </div>

        <label className="mb-1 flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={draft.historize}
            onChange={(event) => {
              set("historize", event.target.checked);
            }}
          />
          {t("metrics.fields.metric_historize")}
        </label>
        <p className="mb-3 text-ink-muted">{t("metrics.form.historizeHint")}</p>

        {save.isError && (
          <p role="alert" className="mb-3 text-state-down">
            ■ {save.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={save.isPending}
          className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {save.isPending
            ? t("metrics.form.saving")
            : editing
              ? t("metrics.form.saveEdit")
              : t("metrics.form.saveCreate")}
        </button>
      </form>
    </SlideOver>
  );
}
