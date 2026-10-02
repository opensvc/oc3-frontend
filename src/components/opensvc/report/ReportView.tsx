import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useIsFetching, useQuery, useQueryClient, type Query } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { download, toCsv } from "@/lib/export/table";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { DownloadIcon, RefreshIcon, SortIcon } from "@/components/ui/icons";
import { TimeChart, type TimeSeries } from "@/components/ui/TimeChart";
import { REPORT_PERIODS } from "./report-period";
import {
  reportLayout,
  type ReportItem,
  type ReportLayout,
  type ReportWidth,
} from "./report-layout";

/** The parsed definition of a report, its layout. */
function useReportLayout(reportId: string) {
  return useQuery({
    queryKey: ["report", reportId, "definition"],
    queryFn: async () => {
      const { data, error } = await api.GET("/reports/{report_id}/definition", {
        params: { path: { report_id: reportId } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return reportLayout(data.data);
    },
  });
}

/** Section anchors from their titles, numbered when a title is empty or repeated. */
function sectionIds(layout: ReportLayout): string[] {
  const seen = new Set<string>();
  return layout.sections.map((section, index) => {
    const slug = section.title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const id = slug === "" || seen.has(slug) ? `section-${String(index + 1)}` : slug;
    seen.add(id);
    return id;
  });
}

/** The results of the metrics and charts a report shows, whatever the report. */
function isSamplesQuery(query: Query): boolean {
  return (
    (query.queryKey[0] === "metric" || query.queryKey[0] === "chart") &&
    query.queryKey[2] === "samples"
  );
}

/** Sections from which the report lists them at its top. */
const CONTENTS_FROM = 3;

/**
 * A report rendered for its readers: its title and description, then each section
 * with its charts — the history of their historized metrics over the chosen period
 * — and its metrics, each run now and shown as figures or as a table. A metric's
 * placeholders take the nodes and services the reader may see, the filterset of the
 * session not existing here.
 *
 * As a `page`, the report is the view's subject: its title heads the page, its
 * sections are listed at its top from `CONTENTS_FROM` on, and each can be linked to
 * (`#anchor`). As a `preview`, it sits in the administration panel, under a notice
 * saying the metrics are run as the current user.
 */
export function ReportView({
  reportId,
  variant,
  days,
  onDaysChange,
  actions,
}: {
  reportId: string;
  variant: "page" | "preview";
  days: number;
  onDaysChange: (days: number) => void;
  /** Controls placed after the period and the refresh, in the report's header. */
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const layout = useReportLayout(reportId);
  const ids = useMemo(
    () => (layout.data === undefined ? [] : sectionIds(layout.data)),
    [layout.data],
  );
  const page = variant === "page";
  const { hash } = useLocation();
  const navigate = useNavigate();

  // A link to a section is followed once the sections exist, the router scrolling
  // on navigation before the definition is read; then once more when the blocks
  // above it have loaded, their results having pushed it down. Only for the page as
  // it opens: a period or a refresh later does not move the reader.
  const loading = useIsFetching({ predicate: isSamplesQuery }) > 0;
  // The blocks start loading only once mounted, after the sections: the link is done
  // with when a loading has been seen to end.
  const followed = useRef<string | null>(null);
  const seenLoading = useRef(false);
  useEffect(() => {
    if (!page || hash === "" || !ids.includes(hash) || followed.current === hash) return;
    document.getElementById(hash)?.scrollIntoView();
    if (loading) seenLoading.current = true;
    else if (seenLoading.current) followed.current = hash;
  }, [page, hash, ids, loading]);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["report", reportId, "definition"] });
    void queryClient.invalidateQueries({ predicate: isSamplesQuery });
  }

  if (layout.isPending) return <p className="text-ink-muted">{t("list.loading")}</p>;
  if (layout.isError)
    return (
      <p role="alert" className="text-state-down">
        ■ {layout.error.message}
      </p>
    );
  const { title, desc, sections } = layout.data;
  if (sections.length === 0 && title === "")
    return (
      <p className="text-ink-muted">{page ? t("reportView.empty") : t("reports.preview.empty")}</p>
    );

  const Heading = page ? "h1" : "h2";
  const SectionHeading = page ? "h2" : "h3";

  return (
    <article className="flex flex-col gap-5">
      {!page && (
        <p className="rounded-(--radius-control) border border-line bg-surface-sunken px-3 py-2 text-ink-muted">
          {t("reports.preview.notice")}
        </p>
      )}
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          {title !== "" && (
            <Heading className="flex items-center gap-2 text-title font-semibold">
              {page && <ObjectIcon kind="report" className="h-5 w-5 shrink-0" />}
              {title}
            </Heading>
          )}
          {desc !== "" && <p className="mt-1 max-w-3xl text-ink-muted">{desc}</p>}
        </div>
        {/* As a page, clear of the anchor that reopens the record panel, fixed on the
            right edge at the height of this header (`PanelAnchor`). */}
        <div className={`flex flex-wrap items-center gap-2 ${page ? "md:pr-10" : ""}`}>
          <div role="group" aria-label={t("reportView.period")} className="flex gap-1">
            {REPORT_PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={days === period}
                onClick={() => {
                  onDaysChange(period);
                }}
                className="h-7 rounded-full border border-line px-2.5 text-ink-muted hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-ink"
              >
                {t("reportView.days", { count: period })}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            title={t("reportView.refresh")}
            aria-label={t("reportView.refresh")}
            className="flex h-7 w-7 items-center justify-center rounded-(--radius-control) border border-line text-ink-muted hover:text-ink"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
          </button>
          {actions}
        </div>
      </header>

      {page && sections.length >= CONTENTS_FROM && (
        <nav
          aria-label={t("reportView.contents")}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
        >
          <span className="text-ink-muted">{t("reportView.contents")}</span>
          {sections.map((section, index) => (
            <a
              key={ids[index]}
              href={`#${ids[index] ?? ""}`}
              onClick={(event) => {
                event.preventDefault();
                void navigate({
                  to: ".",
                  hash: ids[index],
                  search: (previous) => previous,
                  replace: true,
                  resetScroll: false,
                  hashScrollIntoView: { behavior: "smooth" },
                });
              }}
              className="text-accent hover:underline"
            >
              {section.title === "" ? t("reports.preview.untitled") : section.title}
            </a>
          ))}
        </nav>
      )}

      {sections.map((section, index) => (
        <section
          key={ids[index]}
          id={page ? ids[index] : undefined}
          aria-labelledby={page ? `${ids[index] ?? ""}-title` : undefined}
          className="flex scroll-mt-4 flex-col gap-3"
        >
          <div className="border-b border-line pb-1">
            <SectionHeading
              id={page ? `${ids[index] ?? ""}-title` : undefined}
              className="font-semibold"
            >
              {section.title === "" ? t("reports.preview.untitled") : section.title}
            </SectionHeading>
            {section.desc !== "" && <p className="text-ink-muted">{section.desc}</p>}
          </div>
          {section.items.length === 0 ? (
            <p className="text-ink-muted">{t("reports.preview.emptySection")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              {section.items.map((entry, at) =>
                entry.kind === "metric" ? (
                  <MetricBlock key={at} item={entry} />
                ) : (
                  <ChartBlock key={at} item={entry} days={days} />
                ),
              )}
            </div>
          )}
        </section>
      ))}
    </article>
  );
}

/** Columns of the section's six a share takes, from a medium screen on. */
const SPANS: Record<ReportWidth, string> = {
  full: "md:col-span-6",
  half: "md:col-span-3",
  third: "md:col-span-2",
};

const BLOCK =
  "flex min-w-0 flex-col gap-2 rounded-(--radius-panel) border border-line bg-surface p-3";

/** The title of a block, its description under it. */
function BlockTitle({
  kind,
  title,
  desc,
  children,
}: {
  kind: "metric" | "chart";
  title: string;
  desc: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <h4 className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
          <ObjectIcon kind={kind} className="h-3.5 w-3.5 shrink-0" />
          {title}
        </h4>
        {children}
      </div>
      {desc !== "" && <p className="text-ink-muted">{desc}</p>}
    </div>
  );
}

/** A value of a metric's result, as the request returned it. */
type Cell = unknown;

/** A cell as text: an object, which a JSON column holds, as JSON. */
function cellText(value: Cell): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    return String(value);
  return JSON.stringify(value);
}

/** Columns a single row may have to be shown as figures rather than as a table. */
const FIGURES_UP_TO = 4;

/** Rows shown before "Show all": the rest is a click away. */
const ROWS_SHOWN = 12;

/**
 * A metric of the report, run now. A single row of a few numbers reads as figures,
 * one per column; any other result is a table, sortable by its headers, which can
 * be downloaded as CSV.
 */
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
  const title = item.title === "" ? t("reports.preview.metric", { id: item.id }) : item.title;
  const rows: Cell[][] = samples.data?.rows ?? [];
  const columns = samples.data?.columns ?? [];
  const figures =
    rows.length === 1 &&
    columns.length <= FIGURES_UP_TO &&
    (rows[0] ?? []).every((value) => typeof value === "number");

  return (
    <div className={`${BLOCK} ${SPANS[item.width ?? (figures ? "third" : "half")]}`}>
      <BlockTitle kind="metric" title={title} desc={item.desc}>
        {rows.length > 0 && !figures && (
          <button
            type="button"
            onClick={() => {
              download(toCsv({ headers: columns, rows }), `${title}.csv`);
            }}
            title={t("reportView.csv")}
            aria-label={t("reportView.csvOf", { name: title })}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-(--radius-control) text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </BlockTitle>
      {samples.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : samples.isError ? (
        <p role="alert" className="text-state-down">
          ■ {samples.error.message}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-ink-muted">{t("reports.preview.noData")}</p>
      ) : figures ? (
        <Figures columns={columns} values={rows[0] ?? []} locale={i18n.language} />
      ) : (
        <ResultTable columns={columns} rows={rows} locale={i18n.language} />
      )}
      {samples.data?.truncated === true && (
        <p className="text-ink-muted">{t("reports.preview.truncated", { count: rows.length })}</p>
      )}
    </div>
  );
}

/** A single row of numbers, a figure per column under the column's name. */
function Figures({
  columns,
  values,
  locale,
}: {
  columns: string[];
  values: Cell[];
  locale: string;
}) {
  const number = new Intl.NumberFormat(locale);
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {values.map((value, index) => (
        <div key={index} className="flex flex-col-reverse">
          <dt className="text-ink-muted">{columns[index] ?? ""}</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {typeof value === "number" ? number.format(value) : "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Orders two cells: numbers by value, texts as the locale sorts them, empty last. */
function compareCells(a: Cell, b: Cell, collator: Intl.Collator): number {
  const empty = (value: Cell) => value === null || value === undefined || value === "";
  if (empty(a) || empty(b)) return Number(empty(a)) - Number(empty(b));
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(cellText(a), cellText(b));
}

/**
 * A metric's result as a table, in the order of the request until a header is
 * clicked: once ascending, twice descending. The first rows are shown, the others
 * on demand.
 */
function ResultTable({
  columns,
  rows,
  locale,
}: {
  columns: string[];
  rows: Cell[][];
  locale: string;
}) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ column: number; descending: boolean } | null>(null);
  const [all, setAll] = useState(false);
  const number = new Intl.NumberFormat(locale);
  const sorted = useMemo(() => {
    if (sort === null) return rows;
    const collator = new Intl.Collator(locale, { numeric: true });
    const order = sort.descending ? -1 : 1;
    return [...rows].sort((a, b) => order * compareCells(a[sort.column], b[sort.column], collator));
  }, [rows, sort, locale]);
  const shown = all ? sorted : sorted.slice(0, ROWS_SHOWN);

  return (
    <div className="flex flex-col gap-1">
      <div className={`overflow-auto ${all ? "max-h-[32rem]" : ""}`}>
        <table className="w-full text-data">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-line text-left text-ink-muted">
              {columns.map((column, index) => {
                const current = sort?.column === index ? sort : null;
                return (
                  <th
                    key={index}
                    scope="col"
                    aria-sort={
                      current === null ? "none" : current.descending ? "descending" : "ascending"
                    }
                    className="px-1.5 py-1 font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSort(
                          current === null
                            ? { column: index, descending: false }
                            : { column: index, descending: !current.descending },
                        );
                      }}
                      className="flex items-center gap-1 hover:text-ink"
                    >
                      {column}
                      <SortIcon
                        className={`h-3 w-3 ${current === null ? "opacity-40" : "text-ink"}`}
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, index) => (
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
                      cellText(value)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > ROWS_SHOWN && (
        <button
          type="button"
          onClick={() => {
            setAll(!all);
          }}
          className="self-start text-accent hover:underline"
        >
          {all ? t("reportView.showFewer") : t("reportView.showAll", { count: rows.length })}
        </button>
      )}
    </div>
  );
}

/**
 * A chart of the report: the series of the historized metrics it draws, over the
 * last `days` days. It takes the whole width of its section unless its definition
 * says otherwise: a time axis needs room.
 */
function ChartBlock({
  item,
  days,
}: {
  item: Extract<ReportItem, { kind: "chart" }>;
  days: number;
}) {
  const { t, i18n } = useTranslation();
  const samples = useQuery({
    queryKey: ["chart", item.id, "samples", days],
    queryFn: async () => {
      const { data, error } = await api.GET("/charts/{chart_id}/samples", {
        params: { path: { chart_id: item.id }, query: { days } },
      });
      if (error !== undefined) throw new Error(problemText(error));
      return data.data;
    },
  });
  const title = item.title === "" ? t("reports.preview.chart", { id: item.id }) : item.title;

  // A series is named by its instance; with several metrics, by the metric's label too.
  const metrics = new Set(samples.data?.series.map((s) => s.metric_id));
  const series: TimeSeries[] = (samples.data?.series ?? []).map((s, index) => {
    const label =
      s.label === undefined || s.label === ""
        ? t("reports.preview.metric", { id: s.metric_id })
        : s.label;
    const name =
      s.instance === null || s.instance === undefined
        ? label
        : metrics.size > 1
          ? `${label} · ${s.instance}`
          : s.instance;
    return {
      key: `${String(s.metric_id)}:${s.instance ?? ""}:${String(index)}`,
      name,
      points: s.points.flatMap((p): [number, number][] =>
        p[0] === undefined || p[1] === undefined ? [] : [[p[0], p[1]]],
      ),
    };
  });
  const units = new Set(samples.data?.series.map((s) => s.unit ?? "").filter((u) => u !== ""));

  return (
    <div className={`${BLOCK} ${SPANS[item.width ?? "full"]}`}>
      <BlockTitle kind="chart" title={title} desc={item.desc} />
      {/* The chart's height while it loads: the page does not jump under the reader. */}
      <div className={samples.isSuccess ? "" : "min-h-55"}>
        {samples.isPending ? (
          <p className="text-ink-muted">{t("list.loading")}</p>
        ) : samples.isError ? (
          <p role="alert" className="text-state-down">
            ■ {samples.error.message}
          </p>
        ) : series.every((s) => s.points.length === 0) ? (
          <p className="text-ink-muted">{t("reports.preview.noHistory")}</p>
        ) : (
          <TimeChart
            series={series}
            stack={samples.data.stack}
            // One unit for the whole axis only: different units are not summed.
            unit={units.size === 1 ? [...units][0] : undefined}
            locale={i18n.language}
            labels={{
              title: t("reports.preview.chartLabel", { name: title, days }),
              other: t("reports.preview.other"),
              table: t("reports.preview.chartTable"),
              date: t("reports.preview.date"),
              total: t("reports.preview.total"),
            }}
          />
        )}
      </div>
    </div>
  );
}
