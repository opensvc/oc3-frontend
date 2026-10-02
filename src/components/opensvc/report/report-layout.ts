/**
 * The layout of a report, read from its parsed definition (`GET /reports/{id}/
 * definition`), in the historical format: a Title and a Desc, then Sections, each
 * with a Title, a Desc, and its Metrics and Charts — or, in the flat form the
 * historical collector also read, a single `children` list mixing both. Entries of
 * another shape are dropped.
 *
 * The `width` of a block, a CSS flex basis in the historical format ("50%",
 * "30em"…), is read as a share of the section's row when it is a percentage, and
 * ignored otherwise: the block then takes its default share.
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

/** The share of the section's row a block takes, on a wide enough screen. */
export type ReportWidth = "full" | "half" | "third";

export type ReportItem =
  | { kind: "metric"; id: string; title: string; desc: string; width?: ReportWidth }
  | { kind: "chart"; id: string; title: string; desc: string; width?: ReportWidth };

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

/** A percentage rounded to the nearest of the three shares; any other unit, none. */
export function reportWidth(value: unknown): ReportWidth | undefined {
  const match = /^(\d+(?:\.\d+)?)\s*%$/.exec(text(value));
  if (match === null) return undefined;
  const percent = Number(match[1]);
  if (percent >= 75) return "full";
  if (percent >= 40) return "half";
  return "third";
}

function item(entry: unknown): ReportItem | undefined {
  const data = record(entry);
  if (data === undefined) return undefined;
  const common = { title: text(data.Title), desc: text(data.Desc), width: reportWidth(data.width) };
  const metricId = text(data.metric_id);
  if (metricId !== "") return { kind: "metric", id: metricId, ...common };
  const chartId = text(data.chart_id);
  if (chartId !== "") return { kind: "chart", id: chartId, ...common };
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
