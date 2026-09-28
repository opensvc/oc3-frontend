import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { RelatedTable, type RelatedColumn } from "@/components/opensvc/RelatedTable";
import { useServicePackagesDiff } from "./queries";

type PackagesDiff = components["schemas"]["PackagesDiffResponse"];

/** A package that differs between the nodes: its version on each of them. */
interface DiffLine {
  key: string;
  name: string;
  arch: string;
  type: string;
  /** Version installed, by node id; a node missing here lacks this package. */
  versions: Record<string, string[]>;
}

/**
 * The diff rows, one per node having a package version, folded into one line per
 * package (name, architecture, type), as the historical table shows them.
 */
function diffLines(diff: PackagesDiff): DiffLine[] {
  const lines = new Map<string, DiffLine>();
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

/**
 * The packages that differ between the service's nodes, or its encapsulated nodes,
 * as the historical PkgDiff tab listed them, narrowed by a search on the name: a
 * section of the Nodes differences tab, under its own title.
 */
export function PackagesDiffSection({
  svcId,
  encap,
  query,
  title: heading,
}: {
  svcId: string;
  encap: boolean;
  query: string;
  title?: string;
}) {
  const { t } = useTranslation();
  const diff = useServicePackagesDiff(svcId, encap);
  const title =
    heading ?? (encap ? t("services.pkgdiff.encapTitle") : t("services.pkgdiff.clusterTitle"));
  const needle = query.trim().toLowerCase();
  const all = diff.data === undefined || diff.data === null ? [] : diffLines(diff.data);
  const lines = needle === "" ? all : all.filter((l) => l.name.toLowerCase().includes(needle));
  const nodes = diff.data?.meta.nodes ?? [];

  const columns: RelatedColumn<DiffLine>[] = [
    { key: "name", label: t("packages.fields.pkg_name"), render: (l) => l.name, wrap: true },
    { key: "arch", label: t("packages.fields.pkg_arch"), render: (l) => l.arch },
    { key: "type", label: t("packages.fields.pkg_type"), render: (l) => l.type },
    ...nodes.map((node) => ({
      key: node.node_id,
      label: node.nodename === "" ? node.node_id : node.nodename,
      render: (l: DiffLine) => {
        const versions = l.versions[node.node_id];
        return versions === undefined ? (
          // Not installed: a dash, and the words for screen readers.
          <span className="text-ink-muted">
            <span aria-hidden="true">—</span>
            <span className="sr-only">{t("services.pkgdiff.missing")}</span>
          </span>
        ) : (
          <code className="break-all">{versions.join(", ")}</code>
        );
      },
      wrap: true,
    })),
  ];

  // Below two nodes the API has nothing to compare: said, rather than an error.
  const notComparable = diff.isSuccess && diff.data === null;
  const nothing = diff.isSuccess && (diff.data === null || diff.data.meta.nodes.length < 2);

  return (
    <section aria-label={title}>
      <h3 className="mb-1 font-semibold text-ink-muted">{title}</h3>
      {nothing ? (
        <p className="text-ink-muted">
          {notComparable || !encap
            ? t("services.pkgdiff.singleNode")
            : t("services.pkgdiff.noEncap")}
        </p>
      ) : (
        <>
          {diff.isSuccess && (
            <p role="status" className="mb-1 text-ink-muted tabular-nums">
              {needle === ""
                ? t("services.pkgdiff.count", { count: all.length, nodes: nodes.length })
                : t("services.pkgdiff.matching", { count: lines.length, total: all.length })}
            </p>
          )}
          <RelatedTable
            columns={columns}
            groups={[{ key: "diff", label: title, rows: lines }]}
            rowKey={(l) => l.key}
            isPending={diff.isPending}
            errorMessage={diff.isError ? diff.error.message : null}
            empty={needle === "" ? t("services.pkgdiff.identical") : t("services.pkgdiff.noMatch")}
            caption={title}
          />
        </>
      )}
    </section>
  );
}
