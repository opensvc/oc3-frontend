/**
 * Differences between the nodes of a service, as the historical "Nodes
 * differences" tab computes them (`nodediff` in `init/static/js/osvc/tabs/pkgdiff.js`,
 * `show_nodes_compdiff`, `show_nodes_moddiff` and `show_nodes_rsetdiff` in
 * `init/controllers/compliance.py`): only what is not the same on every node is
 * kept.
 */
import type { components } from "@/lib/api/schema";
import type { NodeCompliance } from "./queries";

type PackagesDiff = components["schemas"]["PackagesDiffResponse"];

type NodeRow = components["schemas"]["NodeRow"];

/** Properties naming the node rather than describing it: they always differ. */
const IDENTITY_PROPS = new Set(["node_id", "nodename"]);

function text(v: unknown): string {
  if (v === undefined || v === null) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v as string | number | boolean);
}

/** A node property whose value is not the same on every node. */
export interface AssetDifference {
  prop: string;
  /** Value by node id; an unset value is an empty string, as the historical diff. */
  values: Record<string, string>;
}

export function assetDifferences(nodes: NodeRow[], props: readonly string[]): AssetDifference[] {
  if (nodes.length < 2) return [];
  return props.flatMap((prop) => {
    if (IDENTITY_PROPS.has(prop)) return [];
    const values: Record<string, string> = {};
    for (const node of nodes) values[node.node_id ?? ""] = text(node[prop as keyof NodeRow]);
    return new Set(Object.values(values)).size > 1 ? [{ prop, values }] : [];
  });
}

/** Status of a compliance run: 0 ok, 1 not ok, 2 not applicable. */
export type RunStatus = "ok" | "nok" | "na" | "unknown";

export function runStatus(code: number | undefined): RunStatus {
  return code === 0 ? "ok" : code === 1 ? "nok" : code === 2 ? "na" : "unknown";
}

/** A compliance module whose status is not the same on every node. */
export interface ModuleDifference {
  module: string;
  /** Statuses by node id; a node where the module never ran is absent. */
  statuses: Record<string, RunStatus[]>;
}

export function moduleDifferences(nodes: NodeCompliance[]): ModuleDifference[] {
  if (nodes.length < 2) return [];
  const modules = new Map<string, Record<string, RunStatus[]>>();
  for (const node of nodes) {
    for (const row of node.status) {
      const module = row.run_module ?? "";
      if (module === "") continue;
      const statuses = modules.get(module) ?? {};
      (statuses[node.nodeId] ??= []).push(runStatus(row.run_status));
      modules.set(module, statuses);
    }
  }
  return [...modules]
    .filter(([, statuses]) => {
      const seen = nodes.map((n) => [...new Set(statuses[n.nodeId] ?? [])].sort().join(","));
      return new Set(seen).size > 1;
    })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, statuses]) => ({ module, statuses }));
}

/** A moduleset or ruleset attached to some of the nodes but not all. */
export interface AttachmentDifference {
  name: string;
  /** Ids of the nodes it is attached to. */
  nodes: Set<string>;
}

export function attachmentDifferences(
  nodes: NodeCompliance[],
  names: (node: NodeCompliance) => (string | undefined)[],
): AttachmentDifference[] {
  if (nodes.length < 2) return [];
  const attached = new Map<string, Set<string>>();
  for (const node of nodes) {
    for (const name of names(node)) {
      if (name === undefined || name === "") continue;
      const on = attached.get(name) ?? new Set<string>();
      on.add(node.nodeId);
      attached.set(name, on);
    }
  }
  return [...attached]
    .filter(([, on]) => on.size !== nodes.length)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, on]) => ({ name, nodes: on }));
}

/** A package that differs between the nodes: its versions on each of them. */
export interface PackageDifference {
  key: string;
  name: string;
  arch: string;
  type: string;
  /** Versions installed, by node id; a node missing here lacks this package. */
  versions: Record<string, string[]>;
}

/**
 * The rows of `GET /packages/diff`, one per node having a package version, folded
 * into one line per package (name, architecture, type), as the historical PkgDiff
 * table shows them.
 */
export function packageDifferences(diff: PackagesDiff): PackageDifference[] {
  const lines = new Map<string, PackageDifference>();
  for (const row of diff.data) {
    const key = `${row.pkg_name}\u0000${row.pkg_arch}\u0000${row.pkg_type}`;
    const line = lines.get(key) ?? {
      key,
      name: row.pkg_name,
      arch: row.pkg_arch,
      type: row.pkg_type,
      versions: {},
    };
    (line.versions[row.node_id] ??= []).push(row.pkg_version);
    lines.set(key, line);
  }
  return [...lines.values()];
}
