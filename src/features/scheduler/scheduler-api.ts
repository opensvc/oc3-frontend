import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { formatDuration } from "@/lib/format";

export type SchedulerTaskRow = components["schemas"]["SchedulerTaskRow"];
export type SchedulerRunRow = components["schemas"]["SchedulerRunRow"];

/** The query keys of the lists, invalidated when a task is disabled or enabled. */
export const SCHEDULER_TASKS_KEY = ["scheduler", "tasks"] as const;
export const SCHEDULER_FAILURES_KEY = ["scheduler", "runs", "failed"] as const;

/** The lists follow the runs: the shortest periods are of one minute. */
const REFRESH_MS = 30_000;

const TASK_PROPS = [
  "task_name",
  "parent",
  "task_desc",
  "period_s",
  "timeout_s",
  "is_disabled",
  "declared",
  "next_run_at",
  "last_status",
  "last_begin_at",
  "last_duration_ms",
  "last_error",
  "runs_24h",
  "failures_24h",
  "avg_duration_ms_24h",
  "max_duration_ms_24h",
].join(",");

/** A task and its subtasks, in the order the scheduler runs them. */
export interface SchedulerTaskGroup {
  task: SchedulerTaskRow;
  subtasks: SchedulerTaskRow[];
}

/**
 * The tasks the scheduler declared at its last start, each with its subtasks: the
 * rows of the tasks the code does not hold any more are left out. A subtask whose
 * task is missing is left out too.
 */
export function groupTasks(rows: SchedulerTaskRow[]): SchedulerTaskGroup[] {
  const groups = new Map<string, SchedulerTaskGroup>();
  for (const row of rows) {
    if (row.declared !== true || row.parent !== "") continue;
    groups.set(row.task_name ?? "", { task: row, subtasks: [] });
  }
  for (const row of rows) {
    if (row.declared !== true || row.parent === "" || row.parent === undefined) continue;
    groups.get(row.parent)?.subtasks.push(row);
  }
  return [...groups.values()].sort((a, b) =>
    (a.task.task_name ?? "").localeCompare(b.task.task_name ?? ""),
  );
}

/** The name of a subtask without the name of its task: "alert_frozen" of "alerts_1d: alert_frozen". */
export function subtaskName(row: SchedulerTaskRow): string {
  const name = row.task_name ?? "";
  const prefix = `${row.parent ?? ""}: `;
  return row.parent !== "" && name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

/** A duration in milliseconds: "120 ms", "8.7 s", then in its two largest units. */
export function formatDurationMs(ms: number | null | undefined, locale: string): string {
  if (ms === null || ms === undefined) return "";
  if (ms < 1000)
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "millisecond",
      unitDisplay: "narrow",
    }).format(Math.round(ms));
  if (ms < 60_000)
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "second",
      unitDisplay: "narrow",
      maximumFractionDigits: 1,
    }).format(ms / 1000);
  return formatDuration(ms / 1000, locale);
}

export function useSchedulerTasks() {
  return useQuery({
    queryKey: SCHEDULER_TASKS_KEY,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await api.GET("/scheduler/tasks", {
        params: { query: { props: TASK_PROPS, limit: 0 } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return groupTasks(Array.isArray(data.data) ? data.data : []);
    },
  });
}

/** The last failed runs, the last first. */
export function useSchedulerFailures(limit = 50) {
  return useQuery({
    queryKey: [...SCHEDULER_FAILURES_KEY, limit],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await api.GET("/scheduler/runs", {
        params: {
          query: {
            props: "id,task_name,begin_at,duration_ms,error",
            filter: ["status:eq:failed"],
            limit,
          },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: SchedulerRunRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}

/** Disables or enables a task: the scheduler takes it into account within 5 seconds. */
export async function setTaskDisabled(taskName: string, disabled: boolean): Promise<void> {
  const { error } = await api.PUT("/scheduler/tasks/{task_name}", {
    params: { path: { task_name: taskName } },
    body: { is_disabled: disabled },
  });
  if (error !== undefined) throw new Error(problemText(error));
}
