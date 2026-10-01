/**
 * The layout of a report, read from its parsed definition (`GET /reports/{id}/
 * definition`), in the historical format: a Title and a Desc, then Sections, each
 * with a Title, a Desc, and its Metrics and Charts — or, in the flat form the
 * historical collector also read, a single `children` list mixing both. Entries of
 * another shape are dropped.
 */
export interface ReportLayout {
  title: string;
  desc: string;
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  desc: string;
  items: ReportItem[];
}

export type ReportItem =
  | { kind: "metric"; id: string; title: string; desc: string }
  | { kind: "chart"; id: string; title: string };

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function item(entry: unknown): ReportItem | undefined {
  const data = record(entry);
  if (data === undefined) return undefined;
  const metricId = text(data.metric_id);
  if (metricId !== "")
    return { kind: "metric", id: metricId, title: text(data.Title), desc: text(data.Desc) };
  const chartId = text(data.chart_id);
  if (chartId !== "") return { kind: "chart", id: chartId, title: text(data.Title) };
  return undefined;
}

function items(value: unknown): ReportItem[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const found = item(entry);
        return found === undefined ? [] : [found];
      })
    : [];
}

export function reportLayout(definition: unknown): ReportLayout {
  const root = record(definition) ?? {};
  const sections = Array.isArray(root.Sections)
    ? root.Sections.flatMap((entry): ReportSection[] => {
        const section = record(entry);
        if (section === undefined) return [];
        // As the historical collector: the charts, then the metrics, then the flat list.
        return [
          {
            title: text(section.Title),
            desc: text(section.Desc),
            items: [
              ...items(section.Charts),
              ...items(section.Metrics),
              ...items(section.children),
            ],
          },
        ];
      })
    : [];
  return { title: text(root.Title), desc: text(root.Desc), sections };
}
