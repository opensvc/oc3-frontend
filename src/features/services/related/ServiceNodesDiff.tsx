import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RelatedTable, type RelatedColumn } from "@/components/opensvc/RelatedTable";
import { StatusBadge, type ObjectState } from "@/components/opensvc/StatusBadge";
import {
  CheckIcon,
  CubeIcon,
  GearIcon,
  SearchIcon,
  ServerIcon,
  TargetIcon,
} from "@/components/ui/icons";
import { NODE_PROPS } from "@/features/nodes/node-props";
import {
  assetDifferences,
  attachmentDifferences,
  moduleDifferences,
  packageDifferences,
  type AssetDifference,
  type AttachmentDifference,
  type ModuleDifference,
  type PackageDifference,
  type RunStatus,
} from "./nodes-diff";
import {
  useNodesAssets,
  useNodesCompliance,
  useServiceNodeIds,
  useServicePackagesDiff,
} from "./queries";

const RUN_STATES: Record<RunStatus, ObjectState> = {
  ok: "up",
  nok: "down",
  na: "unknown",
  unknown: "unknown",
};

/** Rows shown before "Show all": a package diff counts hundreds, even thousands. */
const ROW_LIMIT = 200;

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

type CategoryKey = "assets" | "packages" | "modules" | "modulesets" | "rulesets";

/**
 * The mark of each category, after the historical icons: the node for its asset
 * properties, the package cube, and in the compliance tint the module status check
 * (`compstatus`), the moduleset cogs (`modset16`) and, rulesets, the compliance
 * bullseye (`comp16`) rather than their cube, which the packages already show.
 */
const CATEGORY_ICONS: Record<CategoryKey, ReactNode> = {
  assets: <ServerIcon className="h-3.5 w-3.5 shrink-0 text-icon-node" />,
  packages: <CubeIcon className="h-3.5 w-3.5 shrink-0 text-icon-package" />,
  modules: <CheckIcon className="h-3.5 w-3.5 shrink-0 text-icon-form" />,
  modulesets: <GearIcon className="h-3.5 w-3.5 shrink-0 text-icon-form" />,
  rulesets: <TargetIcon className="h-3.5 w-3.5 shrink-0 text-icon-form" />,
};

/**
 * A category of differences, with what its chip says and what its table shows.
 * `count` is undefined while its data loads; `rows` are those matching the search.
 */
interface Category {
  key: CategoryKey;
  count: number | undefined;
  error: string | null;
  isPending: boolean;
  /** Said instead of the table when there is nothing to compare. */
  notice?: string;
  table: (limit: number) => { node: ReactNode; shown: number; total: number };
}

/** The table of a category, capped at `limit` rows. */
function categoryTable<T>(
  title: string,
  columns: RelatedColumn<T>[],
  all: T[],
  rowKey: (row: T) => string,
  isPending: boolean,
  error: string | null,
  empty: string,
  headerTop: string,
) {
  return (limit: number) => ({
    node: (
      <RelatedTable
        columns={columns}
        groups={[{ key: "diff", label: title, rows: all.slice(0, limit) }]}
        rowKey={rowKey}
        isPending={isPending}
        errorMessage={error}
        empty={empty}
        caption={title}
        headerTop={headerTop}
      />
    ),
    shown: Math.min(limit, all.length),
    total: all.length,
  });
}

/**
 * Differences between the nodes running the service, as the historical "Nodes
 * differences" tab: their asset properties, their installed packages, and their
 * compliance (module statuses, attached modulesets and rulesets). Only what is not
 * the same on every node is listed.
 *
 * One category at a time: a strip of chips, on one line, says for each how
 * many differences it holds, or that it is identical, and selects the one shown.
 * The strip and the search stay in view while the table scrolls; long tables show
 * their first rows, the rest on demand. The category chosen lives in the URL
 * (`diff`); without one, the first category with differences is shown.
 */
export function ServiceNodesDiff({ svcId }: { svcId: string }) {
  const { t } = useTranslation();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const nodeIds = useServiceNodeIds(svcId);
  const assets = useNodesAssets(nodeIds.data);
  const packages = useServicePackagesDiff(svcId, false);
  const compliance = useNodesCompliance(nodeIds.data);

  // The strip sticks at the top of the panel: the table header sticks under it.
  const strip = useRef<HTMLDivElement>(null);
  const [stripHeight, setStripHeight] = useState(0);
  useEffect(() => {
    const el = strip.current;
    if (el === null) return;
    const observer = new ResizeObserver(() => {
      setStripHeight(el.offsetHeight);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  });

  if (nodeIds.isPending) return <p className="text-ink-muted">{t("detail.loading")}</p>;
  if (nodeIds.isError)
    return (
      <p role="alert" className="text-state-down">
        ■ {t("detail.error", { message: nodeIds.error.message })}
      </p>
    );
  if (nodeIds.data.length < 2)
    return <p className="text-ink-muted">{t("services.pkgdiff.singleNode")}</p>;

  // The panel body has a 0.75rem padding the sticky elements cover.
  const headerTop = `calc(${String(stripHeight)}px - 0.75rem)`;
  const needle = query.trim().toLowerCase();
  const matches = (...names: string[]) =>
    needle === "" || names.some((n) => n.toLowerCase().includes(needle));
  const empty = needle === "" ? t("services.pkgdiff.identical") : t("services.nodediff.noMatch");

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

  // Assets.
  const assetAll = assetDifferences(assets.data ?? [], NODE_PROPS);
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

  // Packages: their nodes come with the diff, in its own order.
  const packageAll =
    packages.data === undefined || packages.data === null ? [] : packageDifferences(packages.data);
  const packageColumns: RelatedColumn<PackageDifference>[] = [
    { key: "name", label: t("packages.fields.pkg_name"), render: (l) => l.name, wrap: true },
    { key: "arch", label: t("packages.fields.pkg_arch"), render: (l) => l.arch },
    { key: "type", label: t("packages.fields.pkg_type"), render: (l) => l.type },
    ...(packages.data?.meta.nodes ?? []).map((node): RelatedColumn<PackageDifference> => ({
      key: node.node_id,
      label: node.nodename === "" ? node.node_id : node.nodename,
      render: (l) => {
        const versions = l.versions[node.node_id];
        return versions === undefined ? (
          <Missing label={t("services.pkgdiff.missing")} />
        ) : (
          <code className="break-all">{versions.join(", ")}</code>
        );
      },
      wrap: true,
    })),
  ];

  // Compliance.
  const complianceError = compliance.error === null ? null : compliance.error.message;
  const moduleAll = moduleDifferences(compliance.data ?? []);
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
  const modsetAll = attachmentDifferences(compliance.data ?? [], (n) =>
    n.modulesets.map((m) => m.modset_name),
  );
  const rsetAll = attachmentDifferences(compliance.data ?? [], (n) =>
    n.rulesets.map((r) => r.ruleset_name),
  );

  const title = (key: CategoryKey) => t(`services.nodediff.categories.${key}`);
  const categories: Category[] = [
    {
      key: "assets",
      count: assets.isSuccess ? assetAll.length : undefined,
      error: assets.isError ? assets.error.message : null,
      isPending: assets.isPending,
      table: categoryTable(
        title("assets"),
        assetColumns,
        assetAll.filter((d) => matches(d.prop, t(`nodes.fields.${d.prop}`))),
        (d) => d.prop,
        assets.isPending,
        assets.isError ? assets.error.message : null,
        empty,
        headerTop,
      ),
    },
    {
      key: "packages",
      count: packages.isSuccess ? packageAll.length : undefined,
      error: packages.isError ? packages.error.message : null,
      isPending: packages.isPending,
      // The API compares only the nodes the user may see: fewer than two is nothing.
      notice: packages.data === null ? t("services.pkgdiff.singleNode") : undefined,
      table: categoryTable(
        title("packages"),
        packageColumns,
        packageAll.filter((l) => matches(l.name)),
        (l) => l.key,
        packages.isPending,
        packages.isError ? packages.error.message : null,
        empty,
        headerTop,
      ),
    },
    {
      key: "modules",
      count: compliance.data === undefined ? undefined : moduleAll.length,
      error: complianceError,
      isPending: compliance.isPending,
      table: categoryTable(
        title("modules"),
        moduleColumns,
        moduleAll.filter((d) => matches(d.module)),
        (d) => d.module,
        compliance.isPending,
        complianceError,
        empty,
        headerTop,
      ),
    },
    {
      key: "modulesets",
      count: compliance.data === undefined ? undefined : modsetAll.length,
      error: complianceError,
      isPending: compliance.isPending,
      table: categoryTable(
        title("modulesets"),
        attachmentColumns(t("services.nodediff.moduleset")),
        modsetAll.filter((d) => matches(d.name)),
        (d) => d.name,
        compliance.isPending,
        complianceError,
        empty,
        headerTop,
      ),
    },
    {
      key: "rulesets",
      count: compliance.data === undefined ? undefined : rsetAll.length,
      error: complianceError,
      isPending: compliance.isPending,
      table: categoryTable(
        title("rulesets"),
        attachmentColumns(t("services.nodediff.ruleset")),
        rsetAll.filter((d) => matches(d.name)),
        (d) => d.name,
        compliance.isPending,
        complianceError,
        empty,
        headerTop,
      ),
    },
  ];

  // The category asked for in the URL, else the first with differences, else the first.
  const asked = categories.find((c) => c.key === search.diff);
  const active =
    asked ?? categories.find((c) => c.count !== undefined && c.count > 0) ?? categories[0];
  if (active === undefined) return null;

  function select(key: CategoryKey) {
    setQuery("");
    setExpanded(null);
    void navigate({
      to: ".",
      search: (previous) => ({ ...(previous as Record<string, unknown>), diff: key }),
      resetScroll: false,
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = categories.findIndex((c) => c.key === active?.key);
    const target =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (index + 1) % categories.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (index - 1 + categories.length) % categories.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? categories.length - 1
              : -1;
    const next = categories[target];
    if (next === undefined) return;
    event.preventDefault();
    select(next.key);
    strip.current?.querySelector<HTMLElement>(`#nodediff-tab-${next.key}`)?.focus();
  }

  const limit = expanded === `${active.key}\u0000${needle}` ? Infinity : ROW_LIMIT;
  const table = active.table(limit);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={strip}
        // Covers the panel padding, so that the rows scrolling under it stay hidden.
        className="sticky -top-3 z-10 -mx-3 -mt-3 flex flex-col gap-2 border-b border-line bg-surface-raised px-3 pt-3 pb-2"
      >
        <div
          role="tablist"
          aria-label={t("services.nodediff.categoriesLabel")}
          onKeyDown={onKeyDown}
          // One line: it scrolls sideways rather than wrap, should the chips outgrow it.
          className="flex gap-1.5 overflow-x-auto"
        >
          {categories.map((c) => (
            <CategoryChip
              key={c.key}
              category={c}
              label={title(c.key)}
              selected={c.key === active.key}
              onSelect={() => {
                select(c.key);
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-8 w-64 items-center gap-1.5 rounded-(--radius-control) border border-line bg-surface px-2 text-ink-muted">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setExpanded(null);
              }}
              placeholder={t(`services.nodediff.search.${active.key}`)}
              aria-label={t(`services.nodediff.search.${active.key}`)}
              className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          {/* No counter for an identical category: the table says there is no difference. */}
          {active.count !== undefined &&
            active.notice === undefined &&
            (active.count > 0 || needle !== "") && (
              <p role="status" className="text-ink-muted tabular-nums">
                {needle === ""
                  ? t("services.nodediff.count", { count: active.count })
                  : t("services.nodediff.matching", { count: table.total, total: active.count })}
              </p>
            )}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`nodediff-panel-${active.key}`}
        aria-labelledby={`nodediff-tab-${active.key}`}
      >
        {active.notice !== undefined ? (
          <p className="text-ink-muted">{active.notice}</p>
        ) : (
          <>
            {table.node}
            {table.shown < table.total && (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-ink-muted tabular-nums">
                  {t("services.nodediff.shown", { shown: table.shown, total: table.total })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(`${active.key}\u0000${needle}`);
                  }}
                  className="h-7 rounded-(--radius-control) border border-line px-2 text-ink hover:bg-surface-sunken"
                >
                  {t("services.nodediff.showAll", { total: table.total })}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * A category chip: its icon and name, then its count when it holds differences, a
 * check when identical (✓), an ellipsis while it loads, a square on error. The mark
 * and the words, not the tint alone, tell the states apart.
 */
function CategoryChip({
  category,
  label,
  selected,
  onSelect,
}: {
  category: Category;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const { count, error, notice } = category;
  const state =
    error !== null
      ? "error"
      : count === undefined
        ? "pending"
        : count > 0
          ? "differs"
          : notice !== undefined
            ? "none"
            : "identical";
  const described =
    state === "error"
      ? t("services.nodediff.chip.error")
      : state === "pending"
        ? t("services.nodediff.chip.pending")
        : state === "differs"
          ? t("services.nodediff.chip.differs", { count })
          : state === "none"
            ? t("services.nodediff.chip.none")
            : t("services.nodediff.chip.identical");
  const tone =
    state === "differs"
      ? "border-line-strong font-medium text-ink"
      : state === "error"
        ? "border-line text-state-down"
        : "border-line text-ink-muted";
  return (
    <button
      id={`nodediff-tab-${category.key}`}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`nodediff-panel-${category.key}`}
      aria-label={`${label}, ${described}`}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 whitespace-nowrap ${
        selected
          ? "border-accent bg-accent-soft text-ink"
          : `bg-surface ${tone} hover:bg-surface-sunken`
      }`}
    >
      {CATEGORY_ICONS[category.key]}
      {label}
      {state === "differs" ? (
        <span
          aria-hidden="true"
          className="rounded-full bg-surface-sunken px-1.5 text-data font-medium tabular-nums"
        >
          {count}
        </span>
      ) : (
        <span aria-hidden="true" className={state === "identical" ? "text-state-up" : undefined}>
          {state === "identical" ? "✓" : state === "error" ? "■" : state === "pending" ? "…" : "–"}
        </span>
      )}
    </button>
  );
}
