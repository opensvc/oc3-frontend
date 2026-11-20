import { Fragment, useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Switch } from "@/components/ui/Switch";
import { ChevronDownIcon } from "@/components/ui/icons";
import { hasPrivilege, useEffectivePrivileges } from "@/lib/api/effective-privileges";
import { formatDuration } from "@/lib/format";
import {
  SCHEDULER_TASKS_KEY,
  formatDurationMs,
  setTaskDisabled,
  subtaskName,
  useSchedulerFailures,
  useSchedulerTasks,
  type SchedulerTaskGroup,
  type SchedulerTaskRow,
} from "./scheduler-api";

const CELL = "px-3 py-1.5";
const COLUMNS = [
  "task",
  "status",
  "lastRun",
  "duration",
  "nextRun",
  "period",
  "runs24h",
  "duration24h",
  "enabled",
];

/** The status of the last run: ok, failed with its error as a tooltip, or none yet. */
function StatusBadge({ row }: { row: SchedulerTaskRow }) {
  const { t } = useTranslation();
  if (row.last_status === "ok")
    return (
      <span className="whitespace-nowrap text-state-up">● {t("schedulerTasks.status.ok")}</span>
    );
  if (row.last_status === "failed")
    return (
      <span className="whitespace-nowrap text-state-down" title={row.last_error}>
        ■ {t("schedulerTasks.status.failed")}
      </span>
    );
  return <span className="text-ink-muted">{t("schedulerTasks.status.none")}</span>;
}

/** Disables or enables a task: a Manager only, as the api. */
function EnabledCell({ row, editable }: { row: SchedulerTaskRow; editable: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const name = row.task_name ?? "";
  const toggle = useMutation({
    mutationFn: (disabled: boolean) => setTaskDisabled(name, disabled),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: SCHEDULER_TASKS_KEY });
    },
  });
  const enabled = row.is_disabled !== true;
  return (
    <td className={CELL}>
      <Switch
        size="sm"
        checked={enabled}
        label={t("schedulerTasks.enabledLabel", { task: name })}
        stateLabel={enabled ? t("schedulerTasks.enabled") : t("schedulerTasks.disabled")}
        disabled={!editable || toggle.isPending}
        onChange={(checked) => {
          toggle.mutate(!checked);
        }}
      />
      {toggle.isError && (
        <p role="alert" className="mt-1 text-state-down">
          ■ {toggle.error.message}
        </p>
      )}
    </td>
  );
}

/** The cells of a task or a subtask, from its status to its runs of the last 24 hours. */
function RunCells({ row, locale }: { row: SchedulerTaskRow; locale: string }) {
  const { t } = useTranslation();
  const failures = row.failures_24h ?? 0;
  return (
    <>
      <td className={CELL}>
        <StatusBadge row={row} />
      </td>
      <td className={CELL}>
        <RelativeTime value={row.last_begin_at} locale={locale} />
      </td>
      <td className={`${CELL} whitespace-nowrap tabular-nums`}>
        {formatDurationMs(row.last_duration_ms, locale)}
      </td>
      <td className={CELL}>
        {row.parent !== "" ? null : row.is_disabled === true ? (
          <span className="text-ink-muted">{t("schedulerTasks.disabled")}</span>
        ) : (
          <RelativeTime value={row.next_run_at} locale={locale} />
        )}
      </td>
      <td className={`${CELL} whitespace-nowrap`}>
        {row.parent !== "" ? null : (row.period_s ?? 0) > 0 ? (
          formatDuration(row.period_s ?? 0, locale)
        ) : (
          <span className="text-ink-muted">{t("schedulerTasks.notScheduled")}</span>
        )}
      </td>
      <td className={`${CELL} whitespace-nowrap tabular-nums`}>
        {row.runs_24h ?? 0}
        {failures > 0 && (
          <span className="ml-1 text-state-down">
            ({t("schedulerTasks.failures", { count: failures })})
          </span>
        )}
      </td>
      <td className={`${CELL} whitespace-nowrap tabular-nums`}>
        {row.avg_duration_ms_24h === null || row.avg_duration_ms_24h === undefined
          ? ""
          : t("schedulerTasks.avgMax", {
              avg: formatDurationMs(row.avg_duration_ms_24h, locale),
              max: formatDurationMs(row.max_duration_ms_24h, locale),
            })}
      </td>
    </>
  );
}

/** A task, and its subtasks once unfolded. */
function TaskRows({
  group,
  editable,
  locale,
}: {
  group: SchedulerTaskGroup;
  editable: boolean;
  locale: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { task, subtasks } = group;
  const name = task.task_name ?? "";
  const subtasksId = useId();
  return (
    <>
      <tr className="border-b border-line/60 align-top">
        <td className={CELL}>
          <div className="flex items-start gap-1">
            {subtasks.length > 0 ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={subtasks.map((_, i) => `${subtasksId}-${String(i)}`).join(" ")}
                aria-label={t(
                  open ? "schedulerTasks.hideSubtasks" : "schedulerTasks.showSubtasks",
                  {
                    task: name,
                    count: subtasks.length,
                  },
                )}
                onClick={() => {
                  setOpen(!open);
                }}
                className="mt-0.5 rounded-(--radius-control) text-ink-muted hover:text-ink"
              >
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
                />
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <div>
              <code className="font-medium">{name}</code>
              {subtasks.length > 0 && (
                <span className="ml-1 text-ink-muted">
                  {t("schedulerTasks.subtaskCount", { count: subtasks.length })}
                </span>
              )}
              {task.task_desc !== undefined && task.task_desc !== "" && (
                <p className="max-w-md text-ink-muted">{task.task_desc}</p>
              )}
            </div>
          </div>
        </td>
        <RunCells row={task} locale={locale} />
        <EnabledCell row={task} editable={editable} />
      </tr>
      {subtasks.map((sub, i) => (
        <tr
          key={sub.task_name}
          id={`${subtasksId}-${String(i)}`}
          hidden={!open}
          className="border-b border-line/40 bg-surface/50 align-top"
        >
          <td className={`${CELL} pl-10`}>
            <code>{subtaskName(sub)}</code>
            {sub.task_desc !== undefined && sub.task_desc !== "" && (
              <p className="max-w-md text-ink-muted">{sub.task_desc}</p>
            )}
          </td>
          <RunCells row={sub} locale={locale} />
          <td className={CELL} />
        </tr>
      ))}
    </>
  );
}

/** The last failed runs, with their error. */
function Failures({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const id = useId();
  const failures = useSchedulerFailures();
  return (
    <section aria-labelledby={`${id}-title`} className="mt-6">
      <h2 id={`${id}-title`} className="mb-1 font-semibold">
        {t("schedulerTasks.failuresTitle")}
      </h2>
      <p className="mb-3 text-ink-muted">{t("schedulerTasks.failuresIntro")}</p>
      {failures.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : failures.isError ? (
        <p role="alert" className="text-state-down">
          ■ {failures.error.message}
        </p>
      ) : failures.data.length === 0 ? (
        <p className="text-ink-muted">{t("schedulerTasks.noFailure")}</p>
      ) : (
        <ul className="divide-y divide-line/60 rounded-(--radius-panel) border border-line bg-surface-raised">
          {failures.data.map((run) => (
            <li key={run.id} className="px-3 py-2">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <code className="font-medium">{run.task_name}</code>
                <RelativeTime value={run.begin_at} locale={locale} />
                <span className="text-ink-muted tabular-nums">
                  {formatDurationMs(run.duration_ms, locale)}
                </span>
              </div>
              {run.error !== undefined && run.error !== "" && (
                <pre className="mt-1 font-mono text-data whitespace-pre-wrap text-state-down">
                  {run.error}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The tasks of the scheduler: their last run, their next one, their runs of the last
 * 24 hours, and the last failures with their error. A Manager disables or enables a
 * task, the scheduler following within 5 seconds.
 */
export function SchedulerTasksPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const tasks = useSchedulerTasks();
  const privileges = useEffectivePrivileges();
  const editable = privileges.data !== undefined && hasPrivilege(privileges.data, ["Manager"]);
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="schedulerTask" className="h-5 w-5" />
          {t("schedulerTasks.title")}
        </h1>
      </div>
      <p className="mb-4 max-w-3xl text-ink-muted">{t("schedulerTasks.intro")}</p>
      {tasks.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : tasks.isError ? (
        <p role="alert" className="text-state-down">
          ■ {tasks.error.message}
        </p>
      ) : tasks.data.length === 0 ? (
        <p className="text-ink-muted">{t("schedulerTasks.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-panel) border border-line bg-surface-raised">
          <table className="w-full border-collapse text-data">
            <caption className="sr-only">{t("schedulerTasks.title")}</caption>
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                {COLUMNS.map((key) => (
                  <th key={key} scope="col" className={`${CELL} font-medium whitespace-nowrap`}>
                    {t(`schedulerTasks.fields.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.data.map((group) => (
                <Fragment key={group.task.task_name}>
                  <TaskRows group={group} editable={editable} locale={locale} />
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Failures locale={locale} />
    </section>
  );
}
