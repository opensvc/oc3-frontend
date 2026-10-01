import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { YamlCode } from "@/components/ui/YamlCode";
import { useChart } from "./use-chart";

type ChartRow = components["schemas"]["ChartRow"];

const text = (prop: keyof ChartRow) => (row: ChartRow) => {
  const value = row[prop];
  return value === undefined || value === null || value === "" ? undefined : String(value);
};

const GROUPS: DetailGroup<ChartRow>[] = [
  {
    key: "definition",
    family: "state",
    fields: [
      { prop: "chart_name", format: text("chart_name") },
      {
        prop: "chart_yaml",
        format: text("chart_yaml"),
        render: (row) => (
          <div className="max-h-[32rem] overflow-auto rounded-(--radius-control) bg-surface-sunken p-2">
            <YamlCode text={row.chart_yaml ?? ""} lineNumbers />
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

/** A chart, read-only: its name and its YAML definition. */
export function ChartDetailPanel({
  chartId,
  label,
  onClose,
}: {
  chartId: string | undefined;
  label: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: chart, isPending, isError, error } = useChart(chartId);

  return (
    <DetailPanel
      kind="chart"
      open={chartId !== undefined}
      title={chart?.chart_name ?? (label === "" ? t("charts.detail.title") : label)}
      onClose={onClose}
      groups={GROUPS}
      row={chart}
      labelPrefix="charts.fields"
      groupPrefix="charts.detail.groups"
      isPending={isPending}
      errorMessage={isError ? error.message : null}
    />
  );
}
