import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { RelatedTable, type RelatedColumn } from "@/components/opensvc/RelatedTable";
import { DateTime } from "@/components/ui/DateTime";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { SearchIcon } from "@/components/ui/icons";
import { useNodePackages } from "./queries";

type PackageRow = components["schemas"]["PackageRow"];

/**
 * Packages installed on the node, as its agent reports them, by name. A node counts
 * a couple of thousand of them: a search narrows the list as it is typed, on the
 * name and the version, and a link opens the Packages view on this node for the
 * column filters and sorts.
 */
export function NodePackages({ nodeId, locale }: { nodeId: string; locale: string }) {
  const { t } = useTranslation();
  const packages = useNodePackages(nodeId);
  const [query, setQuery] = useState("");
  const all = packages.data ?? [];
  const needle = query.trim().toLowerCase();
  const rows =
    needle === ""
      ? all
      : all.filter(
          (row) =>
            (row.pkg_name ?? "").toLowerCase().includes(needle) ||
            (row.pkg_version ?? "").toLowerCase().includes(needle),
        );

  const columns: RelatedColumn<PackageRow>[] = [
    {
      key: "pkg_name",
      label: t("packages.fields.pkg_name"),
      render: (row) => row.pkg_name,
      wrap: true,
    },
    {
      key: "pkg_version",
      label: t("packages.fields.pkg_version"),
      // Versions run long ("4.0.1really4.0.1-0ubuntu0.24.04.7"): they may break anywhere.
      render: (row) => <code className="break-all">{row.pkg_version}</code>,
      grow: true,
    },
    { key: "pkg_arch", label: t("packages.fields.pkg_arch"), render: (row) => row.pkg_arch },
    { key: "pkg_type", label: t("packages.fields.pkg_type"), render: (row) => row.pkg_type },
    // Only when a package names the provider of its key: most report no signature.
    ...(all.some((row) => (row.sig_provider ?? "") !== "")
      ? [
          {
            key: "sig_provider",
            label: t("packages.fields.sig_provider"),
            render: (row: PackageRow) => row.sig_provider,
          },
        ]
      : []),
    {
      key: "pkg_install_date",
      label: t("packages.fields.pkg_install_date"),
      render: (row) =>
        row.pkg_install_date === undefined ||
        row.pkg_install_date === null ||
        row.pkg_install_date === "" ? null : (
          <DateTime value={row.pkg_install_date} locale={locale} dateOnly />
        ),
    },
  ];

  // The whole list comes from the same push of the agent: its date is said once.
  const updated = all.reduce<string | undefined>(
    (latest, row) =>
      row.pkg_updated !== undefined && (latest === undefined || row.pkg_updated > latest)
        ? row.pkg_updated
        : latest,
    undefined,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 w-64 items-center gap-1.5 rounded-(--radius-control) border border-line bg-surface px-2 text-ink-muted">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={t("nodes.packages.search")}
            aria-label={t("nodes.packages.search")}
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        {packages.isSuccess && (
          <p role="status" className="text-ink-muted tabular-nums">
            {needle === ""
              ? t("nodes.packages.count", { count: all.length })
              : t("nodes.packages.matching", { count: rows.length, total: all.length })}
          </p>
        )}
        <Link
          to="/packages"
          search={{ "f.node_id": `eq:${nodeId}` }}
          className="ml-auto text-accent hover:underline"
        >
          {t("nodes.packages.openView")}
        </Link>
      </div>
      {updated !== undefined && (
        <p className="text-ink-muted">
          {t("nodes.packages.reported")} <RelativeTime value={updated} locale={locale} />
        </p>
      )}
      <RelatedTable
        columns={columns}
        groups={[{ key: "packages", label: t("nodes.related.packages"), rows }]}
        rowKey={(row) => String(row.id ?? `${row.pkg_name ?? ""}:${row.pkg_arch ?? ""}`)}
        isPending={packages.isPending}
        errorMessage={packages.isError ? packages.error.message : null}
        empty={needle === "" ? t("nodes.packages.empty") : t("nodes.packages.noMatch")}
        caption={t("nodes.related.packages")}
      />
    </div>
  );
}
