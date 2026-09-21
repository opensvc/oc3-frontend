import { readProp } from "@/lib/row";

/**
 * Ligne de la file d'actions.
 *
 * Écart assumé à la règle « corriger la spec côté oc3 » : `GET /actions` renvoie le
 * `ListResponse` générique, dont les lignes sont typées `Record<string, never>`. Le
 * type est donc décrit ici, en un seul endroit, avec une lecture défensive. À
 * supprimer le jour où la spec typera la réponse, comme pour les tags.
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
 * Statuts de l'ancien collector (`init/actiond/actiond.py`) : « T » terminée et
 * « C » annulée sont les seuls états finaux, tout le reste attend son tour ou
 * s'exécute.
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

/** Date « zéro » de MySQL : une action jamais dépilée n'a pas de date de fin. */
export function realDate(value: string): string | undefined {
  return value === "" || value.startsWith("0000-00-00") ? undefined : value;
}
