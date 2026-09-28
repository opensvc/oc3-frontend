import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RelatedTable, type RelatedColumn } from "@/components/opensvc/RelatedTable";
import { StatusBadge, type ObjectState } from "@/components/opensvc/StatusBadge";
import { CheckIcon, SearchIcon } from "@/components/ui/icons";
import { NODE_PROPS } from "@/features/nodes/node-props";
import { PackagesDiffSection } from "./PackagesDiffSection";
import {
  assetDifferences,
  attachmentDifferences,
  moduleDifferences,
  type AssetDifference,
  type AttachmentDifference,
  type ModuleDifference,
  type RunStatus,
} from "./nodes-diff";
import { useNodesAssets, useNodesCompliance, useServiceNodeIds } from "./queries";

const RUN_STATES: Record<RunStatus, ObjectState> = {
  ok: "up",
  nok: "down",
  na: "unknown",
  unknown: "unknown",
};

/** A compared node: its id and the name heading its column. */
interface Compared {
  id: string;
  name: string;
}

/** A dash where a node has nothing, and the words for screen readers. */
function Missing({ label }: { label: string }) {
  return (
    <span className="text-ink-muted">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-1 font-semibold text-ink-muted">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Differences between the nodes running the service, as the historical "Nodes
 * differences" tab: their asset properties, their installed packages, and their
 * compliance (module statuses, attached modulesets and rulesets). Only what is not
 * the same on every node is listed; a search narrows every list on its names.
 */
export function ServiceNodesDiff({ svcId }: { svcId: string }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const nodeIds = useServiceNodeIds(svcId);
  const assets = useNodesAssets(nodeIds.data);
  const compliance = useNodesCompliance(nodeIds.data);
  const needle = query.trim().toLowerCase();
  const matches = (...names: string[]) =>
    needle === "" || names.some((n) => n.toLowerCase().includes(needle));

  if (nodeIds.isPending) return <p className="text-ink-muted">{t("detail.loading")}</p>;
  if (nodeIds.isError)
    return (
      <p role="alert" className="text-state-down">
        ■ {t("detail.error", { message: nodeIds.error.message })}
      </p>
    );
  if (nodeIds.data.length < 2)
    return <p className="text-ink-muted">{t("services.pkgdiff.singleNode")}</p>;

  const nodes: Compared[] = (assets.data ?? []).map((n) => ({
    id: n.node_id ?? "",
    name: n.nodename ?? n.node_id ?? "",
  }));
  const nodeColumns = <T,>(render: (row: T, node: Compared) => ReactNode) =>
    nodes.map((node): RelatedColumn<T> => ({
      key: node.id,
      label: node.name,
      render: (row) => render(row, node),
      wrap: true,
    }));

  const assetRows = assetDifferences(assets.data ?? [], NODE_PROPS).filter((d) =>
    matches(d.prop, t(`nodes.fields.${d.prop}`)),
  );
  const assetColumns: RelatedColumn<AssetDifference>[] = [
    {
      key: "prop",
      label: t("services.nodediff.property"),
      render: (d) => t(`nodes.fields.${d.prop}`),
    },
    ...nodeColumns<AssetDifference>((d, node) => {
      const value = d.values[node.id] ?? "";
      return value === "" ? <Missing label={t("services.nodediff.unset")} /> : value;
    }),
  ];

  const complianceError = compliance.error === null ? null : compliance.error.message;
  const moduleRows = moduleDifferences(compliance.data ?? []).filter((d) => matches(d.module));
  const moduleColumns: RelatedColumn<ModuleDifference>[] = [
    { key: "module", label: t("services.nodediff.module"), render: (d) => d.module, wrap: true },
    ...nodeColumns<ModuleDifference>((d, node) => {
      const statuses = d.statuses[node.id];
      if (statuses === undefined) return <Missing label={t("services.nodediff.notRun")} />;
      return (
        <span className="flex flex-col">
          {statuses.map((s, i) => (
            <StatusBadge
              key={i}
              state={RUN_STATES[s]}
              label={t(`services.nodediff.runStatus.${s}`)}
            />
          ))}
        </span>
      );
    }),
  ];

  const attachmentColumns = (label: string): RelatedColumn<AttachmentDifference>[] => [
    { key: "name", label, render: (d) => d.name, wrap: true },
    ...nodeColumns<AttachmentDifference>((d, node) =>
      d.nodes.has(node.id) ? (
        <span className="inline-flex items-center gap-1 text-state-up">
          <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {t("services.nodediff.attached")}
        </span>
      ) : (
        <Missing label={t("services.nodediff.notAttached")} />
      ),
    ),
  ];
  const modsetRows = attachmentDifferences(compliance.data ?? [], (n) =>
    n.modulesets.map((m) => m.modset_name),
  ).filter((d) => matches(d.name));
  const rsetRows = attachmentDifferences(compliance.data ?? [], (n) =>
    n.rulesets.map((r) => r.ruleset_name),
  ).filter((d) => matches(d.name));

  const table = <T,>(
    title: string,
    columns: RelatedColumn<T>[],
    rows: T[],
    rowKey: (row: T) => string,
    isPending: boolean,
    error: string | null,
  ) => (
    <Section title={title}>
      <RelatedTable
        columns={columns}
        groups={[{ key: "diff", label: title, rows }]}
        rowKey={rowKey}
        isPending={isPending}
        errorMessage={error}
        empty={needle === "" ? t("services.pkgdiff.identical") : t("services.nodediff.noMatch")}
        caption={title}
      />
    </Section>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 w-64 items-center gap-1.5 rounded-(--radius-control) border border-line bg-surface px-2 text-ink-muted">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={t("services.nodediff.search")}
            aria-label={t("services.nodediff.search")}
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <p className="text-ink-muted">
          {t("services.nodediff.compared", { nodes: nodes.map((n) => n.name).join(", ") })}
        </p>
      </div>

      {table(
        t("services.nodediff.assetTitle"),
        assetColumns,
        assetRows,
        (d) => d.prop,
        assets.isPending,
        assets.isError ? assets.error.message : null,
      )}

      <PackagesDiffSection
        svcId={svcId}
        encap={false}
        query={query}
        title={t("services.nodediff.pkgTitle")}
      />

      {table(
        t("services.nodediff.moduleTitle"),
        moduleColumns,
        moduleRows,
        (d) => d.module,
        compliance.isPending,
        complianceError,
      )}
      {table(
        t("services.nodediff.modsetTitle"),
        attachmentColumns(t("services.nodediff.moduleset")),
        modsetRows,
        (d) => d.name,
        compliance.isPending,
        complianceError,
      )}
      {table(
        t("services.nodediff.rsetTitle"),
        attachmentColumns(t("services.nodediff.ruleset")),
        rsetRows,
        (d) => d.name,
        compliance.isPending,
        complianceError,
      )}
    </div>
  );
}
