import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { reportLayout, type ReportItem } from "./report-layout";

/**
 * The report as its readers see it: its title and description, then each section
 * with its metrics, each a table of the metric's result, run now. The charts, drawn
 * from the history of the metrics, are not rendered yet: they are named in their
 * place. Like the historical collector, a metric's placeholders take the nodes and
 * services the reader may see, the filterset of the session not existing here.
 */
export function ReportPreview({ reportId }: { reportId: string }) {
  const { t } = useTranslation();
  const definition = useQuery({
    queryKey: ["report", reportId, "definition"],
    queryFn: async () => {
      const { data, error } = await api.GET("/reports/{report_id}/definition", {
        params: { path: { report_id: reportId } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data;
    },
  });

  if (definition.isPending) return <p className="text-ink-muted">{t("list.loading")}</p>;
  if (definition.isError)
    return (
      <p role="alert" className="text-state-down">
        ■ {definition.error.message}
      </p>
    );
  const layout = reportLayout(definition.data);
  if (layout.sections.length === 0 && layout.title === "")
    return <p className="text-ink-muted">{t("reports.preview.empty")}</p>;

  return (
    <article className="flex flex-col gap-5">
      <p className="rounded-(--radius-control) border border-line bg-surface-sunken px-3 py-2 text-ink-muted">
        {t("reports.preview.notice")}
      </p>
      {(layout.title !== "" || layout.desc !== "") && (
        <header>
          {layout.title !== "" && <h2 className="text-title font-semibold">{layout.title}</h2>}
          {layout.desc !== "" && <p className="mt-1 text-ink-muted">{layout.desc}</p>}
        </header>
      )}
      {layout.sections.map((section, index) => (
        <section key={index} className="flex flex-col gap-3">
          <div className="border-b border-line pb-1">
            <h3 className="font-semibold">
              {section.title === "" ? t("reports.preview.untitled") : section.title}
            </h3>
            {section.desc !== "" && <p className="text-ink-muted">{section.desc}</p>}
          </div>
          {section.items.length === 0 ? (
            <p className="text-ink-muted">{t("reports.preview.emptySection")}</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
              {section.items.map((entry, at) =>
                entry.kind === "metric" ? (
                  <MetricBlock key={at} item={entry} />
                ) : (
                  <ChartPlaceholder key={at} item={entry} />
                ),
              )}
            </div>
          )}
        </section>
      ))}
    </article>
  );
}

const BLOCK =
  "flex min-w-0 flex-col gap-2 rounded-(--radius-panel) border border-line bg-surface p-3";

/** A metric of the report: its result as a table, its columns as the request names them. */
function MetricBlock({ item }: { item: Extract<ReportItem, { kind: "metric" }> }) {
  const { t, i18n } = useTranslation();
  const samples = useQuery({
    queryKey: ["metric", item.id, "samples"],
    queryFn: async () => {
      const { data, error } = await api.GET("/metrics/{metric_id}/samples", {
        params: { path: { metric_id: item.id } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data;
    },
  });
  const number = new Intl.NumberFormat(i18n.language);

  return (
    <div className={BLOCK}>
      <h4 className="flex items-center gap-1.5 font-medium">
        <ObjectIcon kind="metric" className="h-3.5 w-3.5 shrink-0" />
        {item.title === "" ? t("reports.preview.metric", { id: item.id }) : item.title}
      </h4>
      {item.desc !== "" && <p className="text-ink-muted">{item.desc}</p>}
      {samples.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : samples.isError ? (
        <p role="alert" className="text-state-down">
          ■ {samples.error.message}
        </p>
      ) : samples.data.rows.length === 0 ? (
        <p className="text-ink-muted">{t("reports.preview.noData")}</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-data">
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                {samples.data.columns.map((column, index) => (
                  <th key={index} scope="col" className="px-1.5 py-1 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {samples.data.rows.map((row, index) => (
                <tr key={index} className="border-b border-line last:border-b-0">
                  {row.map((value, at) => (
                    <td
                      key={at}
                      className={`px-1.5 py-1 ${typeof value === "number" ? "text-right tabular-nums" : ""}`}
                    >
                      {value === null || value === undefined ? (
                        <span className="text-ink-muted">—</span>
                      ) : typeof value === "number" ? (
                        number.format(value)
                      ) : (
                        String(value)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {samples.data.truncated === true && (
            <p className="mt-1 text-ink-muted">
              {t("reports.preview.truncated", { count: samples.data.rows.length })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** A chart of the report, named in its place: the charts are not drawn yet. */
function ChartPlaceholder({ item }: { item: Extract<ReportItem, { kind: "chart" }> }) {
  const { t } = useTranslation();
  return (
    <div className={`${BLOCK} border-dashed`}>
      <h4 className="flex items-center gap-1.5 font-medium">
        <ObjectIcon kind="report" className="h-3.5 w-3.5 shrink-0" />
        {item.title === "" ? t("reports.preview.chart", { id: item.id }) : item.title}
      </h4>
      <p className="text-ink-muted">{t("reports.preview.chartPending")}</p>
    </div>
  );
}
