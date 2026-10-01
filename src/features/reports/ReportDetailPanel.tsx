import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { YamlCode } from "@/components/ui/YamlCode";
import { useReport } from "./use-report";

type ReportRow = components["schemas"]["ReportRow"];

const text = (prop: keyof ReportRow) => (row: ReportRow) => {
  const value = row[prop];
  return value === undefined || value === null || value === "" ? undefined : String(value);
};

const GROUPS: DetailGroup<ReportRow>[] = [
  {
    key: "definition",
    family: "state",
    fields: [
      { prop: "report_name", format: text("report_name") },
      {
        prop: "report_yaml",
        format: text("report_yaml"),
        // A definition reads best as typed, indentation included: YAML depends on it.
        render: (row) => (
          <div className="max-h-[32rem] overflow-auto rounded-(--radius-control) bg-surface-sunken p-2">
            <YamlCode text={row.report_yaml ?? ""} lineNumbers />
          </div>
        ),
      },
    ],
  },
  {
    key: "record",
    family: "time",
    fields: [{ prop: "id", format: text("id") }],
  },
];

/** A report, read-only: its name and its YAML definition. */
export function ReportDetailPanel({
  reportId,
  label,
  onClose,
}: {
  reportId: string | undefined;
  label: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: report, isPending, isError, error } = useReport(reportId);

  return (
    <DetailPanel
      kind="report"
      open={reportId !== undefined}
      title={report?.report_name ?? (label === "" ? t("reports.detail.title") : label)}
      onClose={onClose}
      groups={GROUPS}
      row={report}
      labelPrefix="reports.fields"
      groupPrefix="reports.detail.groups"
      isPending={isPending}
      errorMessage={isError ? error.message : null}
    />
  );
}
