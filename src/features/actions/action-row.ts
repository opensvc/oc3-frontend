import { readProp } from "@/lib/row";

/**
 * Row of the action queue.
 *
 * A deliberate departure from the "fix the spec on the oc3 side" rule: `GET /actions`
 * returns the generic `ListResponse`, whose rows are typed `Record<string, never>`.
 * The type is therefore described here, in a single place, with a defensive read. To
 * be removed the day the spec types the response, as for the tags.
 */
export interface ActionRow {
  id: string;
  status: string;
  command: string;
  action_type: string;
  connect_to: string;
  date_queued: string;
  date_dequeued: string;
  ret: string;
  stdout: string;
  stderr: string;
  node_id: string;
  svc_id: string;
  "nodes.nodename": string;
  "services.svcname": string;
}

export const ACTION_PROPS: (keyof ActionRow)[] = [
  "id",
  "status",
  "command",
  "nodes.nodename",
  "services.svcname",
  "action_type",
  "connect_to",
  "date_queued",
  "date_dequeued",
  "ret",
  "stdout",
  "stderr",
  "node_id",
  "svc_id",
];

/**
 * Statuses of the old collector (`init/actiond/actiond.py`): "T" finished and "C"
 * cancelled are the only final states, everything else is waiting its turn or
 * running.
 */
const DONE = new Set(["T", "C"]);

export function isPending(status: string): boolean {
  return status !== "" && !DONE.has(status);
}

function asText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function toActionRows(data: unknown): ActionRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const read = (prop: string) => asText(readProp(row, prop));
    return {
      id: read("id"),
      status: read("status"),
      command: read("command"),
      action_type: read("action_type"),
      connect_to: read("connect_to"),
      date_queued: read("date_queued"),
      date_dequeued: read("date_dequeued"),
      ret: read("ret"),
      stdout: read("stdout"),
      stderr: read("stderr"),
      node_id: read("node_id"),
      svc_id: read("svc_id"),
      "nodes.nodename": read("nodes.nodename"),
      "services.svcname": read("services.svcname"),
    };
  });
}

/** MySQL "zero" date: an action never taken has no end date. */
export function realDate(value: string): string | undefined {
  return value === "" || value.startsWith("0000-00-00") ? undefined : value;
}
