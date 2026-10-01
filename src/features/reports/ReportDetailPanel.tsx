import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { DetailContent, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { RelatedTabsPanel } from "@/components/opensvc/RelatedTabsPanel";
import type { RelatedTab } from "@/components/opensvc/related-tabs";
import { PieChartIcon } from "@/components/ui/icons";
import { YamlCode } from "@/components/ui/YamlCode";
import { ReportPreview } from "./ReportPreview";
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

/** The report rendered as its readers see it, in a tab of its own. */
const REPORT_TABS: RelatedTab[] = [
  {
    key: "preview",
    labelKey: "reports.preview.tab",
    icon: <PieChartIcon className="h-3.5 w-3.5 text-icon-metric" />,
    // No count: a preview is not a list.
    useSummary: () => ({ count: undefined }),
    render: (id) => <ReportPreview reportId={id} />,
  },
];

/**
 * A report: its name and its YAML definition, then a tab previewing it rendered.
 * The open tab lives in the URL (`tab`), held by the view.
 */
export function ReportDetailPanel({
  reportId,
  label,
  onClose,
  tab,
  onTabChange,
}: {
  reportId: string | undefined;
  label: string;
  onClose: () => void;
  tab: string | undefined;
  onTabChange: (tab: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const { data: report, isPending, isError, error } = useReport(reportId);
  const open = reportId !== undefined;

  return (
    <RelatedTabsPanel
      open={open}
      title={report?.report_name ?? (label === "" ? t("reports.detail.title") : label)}
      kind="report"
      onClose={onClose}
      objectId={reportId}
      tabs={REPORT_TABS}
      tab={tab}
      onTabChange={onTabChange}
      propertiesFamily="state"
      label={t("reports.detail.tabs")}
    >
      <DetailContent
        groups={GROUPS}
        row={report}
        labelPrefix="reports.fields"
        groupPrefix="reports.detail.groups"
        isPending={open && isPending}
        errorMessage={isError ? error.message : null}
      />
    </RelatedTabsPanel>
  );
}
