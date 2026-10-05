import type { components } from "@/lib/api/schema";

type ResourceRow = components["schemas"]["ResourceRow"];

/** An agent flag, T or F: true, false, or undefined when unknown. */
export function resourceFlag(value: unknown): boolean | undefined {
  if (value === "T" || value === true) return true;
  if (value === "F" || value === false) return false;
  return undefined;
}

/** A resource by its place: "service @ node: rid", the container after the node. */
export function resourceName(row: ResourceRow): string {
  const service = row["services.svcname"] ?? row.svc_id ?? "";
  const node = row["nodes.nodename"] ?? row.node_id ?? "";
  const where = row.vmname !== undefined && row.vmname !== "" ? `${node}/${row.vmname}` : node;
  return `${service} @ ${where}: ${row.rid ?? ""}`;
}
