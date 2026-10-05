import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { CrossLink } from "@/components/opensvc/CrossLink";
import { RelatedTable, type RelatedColumn } from "@/components/opensvc/RelatedTable";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useNodeChecks } from "./queries";

type CheckRow = components["schemas"]["CheckRow"];

/** Natural sort of instances: /data2 before /data10. */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function NodeChecks({ nodeId, locale }: { nodeId: string; locale: string }) {
  const { t } = useTranslation();
  const checks = useNodeChecks(nodeId);
  const rows = checks.data ?? [];

  // Grouped by type, as the agent reports them: a type is one kind of measure.
  const types = [...new Set(rows.map((row) => row.chk_type ?? ""))].sort(collator.compare);
  const groups = types.map((type) => ({
    key: type,
    label: type,
    rows: rows
      .filter((row) => (row.chk_type ?? "") === type)
      .sort((a, b) => collator.compare(a.chk_instance ?? "", b.chk_instance ?? "")),
  }));
  // Checks are reported together: the latest update dates them all.
  const updated = rows.reduce<string | undefined>(
    (latest, row) =>
      row.chk_updated !== undefined && (latest === undefined || row.chk_updated > latest)
        ? row.chk_updated
        : latest,
    undefined,
  );

  const columns: RelatedColumn<CheckRow>[] = [
    {
      key: "chk_instance",
      label: t("nodes.checks.fields.chk_instance"),
      grow: true,
      render: (row) => <code>{row.chk_instance}</code>,
    },
    {
      key: "services.svcname",
      label: t("nodes.checks.fields.object"),
      render: (row) =>
        row["services.svcname"] === null || row["services.svcname"] === undefined ? null : (
          <CrossLink kind="service" id={row.svc_id}>
            {row["services.svcname"]}
          </CrossLink>
        ),
    },
    {
      key: "chk_value",
      label: t("nodes.checks.fields.chk_value"),
      numeric: true,
      render: (row) => row.chk_value,
    },
    {
      key: "thresholds",
      label: t("nodes.checks.fields.thresholds"),
      render: (row) =>
        (row.chk_low ?? null) === null && (row.chk_high ?? null) === null ? (
          <span className="text-ink-muted">{t("nodes.checks.noThresholds")}</span>
        ) : (
          <>
            <span className="tabular-nums">
              {row.chk_low ?? "−∞"} – {row.chk_high ?? "+∞"}
            </span>{" "}
            <span className="text-ink-muted">{row.chk_threshold_provider}</span>
          </>
        ),
    },
    {
      key: "chk_err",
      label: t("nodes.checks.fields.chk_err"),
      // Out of bounds is said with a glyph and a word, not by its color alone.
      render: (row) =>
        row.chk_err === 1 ? (
          <span className="text-state-down">▼ {t("nodes.checks.below")}</span>
        ) : row.chk_err === 2 ? (
          <span className="text-state-down">▲ {t("nodes.checks.above")}</span>
        ) : row.chk_err === 0 ? (
          <span className="text-state-up">● {t("nodes.checks.within")}</span>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {updated !== undefined && (
        <p className="text-ink-muted">
          {t("nodes.checks.reported")} <RelativeTime value={updated} locale={locale} />
        </p>
      )}
      <RelatedTable
        columns={columns}
        groups={groups}
        rowKey={(row) => String(row.id ?? `${row.chk_type ?? ""}:${row.chk_instance ?? ""}`)}
        isPending={checks.isPending}
        errorMessage={checks.isError ? checks.error.message : null}
        empty={t("nodes.checks.empty")}
        caption={t("nodes.related.checks")}
      />
    </div>
  );
}
