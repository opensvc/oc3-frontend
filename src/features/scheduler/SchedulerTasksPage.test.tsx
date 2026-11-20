import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { SchedulerTasksPage } from "./SchedulerTasksPage";
import { formatDurationMs, groupTasks, subtaskName } from "./scheduler-api";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const TASKS = [
  {
    task_name: "alerts_1d",
    parent: "",
    task_desc: "",
    period_s: 86400,
    is_disabled: false,
    declared: true,
    next_run_at: "2099-01-01 10:30:55",
    last_status: "failed",
    last_begin_at: "2026-11-18 10:30:55.000",
    last_duration_ms: 8717,
    last_error: "Table 'opensvc.comp_ruleset' doesn't exist",
    runs_24h: 1,
    failures_24h: 1,
    avg_duration_ms_24h: 8717,
    max_duration_ms_24h: 8717,
  },
  {
    task_name: "alerts_1d: alert_frozen",
    parent: "alerts_1d",
    period_s: 86400,
    is_disabled: false,
    declared: true,
    next_run_at: "",
    last_status: "ok",
    last_duration_ms: 12,
    runs_24h: 1,
    failures_24h: 0,
  },
  {
    task_name: "notify",
    parent: "",
    task_desc: "send the new alerts of the dashboard",
    period_s: 60,
    is_disabled: true,
    declared: true,
    next_run_at: "",
    last_status: "ok",
    runs_24h: 0,
    failures_24h: 0,
  },
  // A task the code does not hold any more.
  { task_name: "gone", parent: "", declared: false, period_s: 60 },
];

describe("the scheduler tasks", () => {
  test("are grouped with their subtasks, the undeclared left out", () => {
    const groups = groupTasks([...TASKS].reverse());
    expect(groups.map((g) => g.task.task_name)).toEqual(["alerts_1d", "notify"]);
    expect(groups[0]?.subtasks.map((s) => s.task_name)).toEqual(["alerts_1d: alert_frozen"]);
    expect(subtaskName(TASKS[1] ?? {})).toBe("alert_frozen");
    expect(subtaskName(TASKS[0] ?? {})).toBe("alerts_1d");
  });

  test("durations read in their unit", () => {
    expect(formatDurationMs(120, "en")).toBe("120ms");
    expect(formatDurationMs(8717, "en")).toBe("8.7s");
    expect(formatDurationMs(125_000, "en")).toBe("2m 5s");
    expect(formatDurationMs(null, "en")).toBe("");
  });
});

describe("the scheduler tasks page", () => {
  let put: { path: string; body: unknown }[];

  function stubApi(privileges: { role: string; privilege: string }[]) {
    put = [];
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const request = input instanceof Request ? input : new Request(String(input));
      const path = decodeURIComponent(new URL(request.url).pathname.replace(/^\/api/, ""));
      if (request.method === "PUT") {
        put.push({ path, body: await request.json() });
        return json({ data: [] });
      }
      switch (path) {
        case "/scheduler/tasks":
          return json({ data: TASKS });
        case "/scheduler/runs":
          return json({
            data: [
              {
                id: 7,
                task_name: "alerts_1d",
                begin_at: "2026-11-18 10:30:55.000",
                duration_ms: 8717,
                error: "Table 'opensvc.comp_ruleset' doesn't exist",
              },
            ],
          });
        case "/users/self/groups":
          return json({ data: privileges });
      }
      return json({ text: "not found" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
  }

  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <SchedulerTasksPage />
      </QueryClientProvider>,
    );
  }

  test("lists the tasks, their subtasks folded, and the last failures", async () => {
    stubApi([]);
    renderPage();
    const table = await screen.findByRole("table", { name: "Scheduler tasks" });
    expect(within(table).getByText("alerts_1d")).toBeInTheDocument();
    expect(within(table).getByText("notify")).toBeInTheDocument();
    expect(within(table).queryByText("gone")).not.toBeInTheDocument();
    expect(within(table).getByText(/failed/, { selector: "span[title]" })).toHaveAttribute(
      "title",
      "Table 'opensvc.comp_ruleset' doesn't exist",
    );
    const subtask = within(table).getByText("alert_frozen").closest("tr");
    expect(subtask).not.toBeVisible();
    fireEvent.click(within(table).getByRole("button", { name: "Show the subtasks of alerts_1d" }));
    expect(subtask).toBeVisible();

    const failures = (await screen.findByRole("heading", { name: "Last failures" })).closest(
      "section",
    );
    if (failures === null) throw new Error("no section");
    expect(
      await within(failures).findByText("Table 'opensvc.comp_ruleset' doesn't exist"),
    ).toBeInTheDocument();
  });

  test("a Manager disables a task", async () => {
    stubApi([{ role: "Manager", privilege: "T" }]);
    renderPage();
    const toggle = await screen.findByRole("switch", { name: "Task alerts_1d : enabled" });
    await waitFor(() => {
      expect(toggle).toBeEnabled();
    });
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(put).toEqual([{ path: "/scheduler/tasks/alerts_1d", body: { is_disabled: true } }]);
    });
  });

  test("a user without the Manager privilege can not", async () => {
    stubApi([{ role: "Ops", privilege: "F" }]);
    renderPage();
    const toggle = await screen.findByRole("switch", { name: "Task notify : disabled" });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
