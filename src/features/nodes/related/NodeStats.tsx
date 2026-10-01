import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { TimeChart, type TimeSeries } from "@/components/ui/TimeChart";

type NodeStatSeries = components["schemas"]["NodeStatSeries"];
type Group = "cpu" | "proc" | "mem" | "swap" | "block" | "netdev" | "netdev_err" | "blockdev";

/** The periods offered, in days. */
const PERIODS = [1, 7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const GROUPS: readonly Group[] = [
  "cpu",
  "proc",
  "mem",
  "swap",
  "block",
  "netdev",
  "netdev_err",
  "blockdev",
];

/**
 * The charts of the tab: each takes some metrics of a group — those of one unit,
 * since a chart has a single axis — named as the historical collector's charts
 * did. A chart of a group by device takes the metrics of every device.
 */
const CHARTS: {
  key: string;
  group: Group;
  metrics: string[];
  unit?: string;
  stack?: boolean;
}[] = [
  {
    key: "cpu",
    group: "cpu",
    // idle is what is left: stacked under the others it would fill the chart.
    metrics: ["usr", "nice", "sys", "iowait", "steal", "irq", "soft", "guest"],
    unit: "%",
    stack: true,
  },
  { key: "load", group: "proc", metrics: ["ldavg_1", "ldavg_5", "ldavg_15", "runq_sz"] },
  { key: "mem", group: "mem", metrics: ["pct_memused", "pct_commit"], unit: "%" },
  { key: "swap", group: "swap", metrics: ["pct_swpused", "pct_swpcad"], unit: "%" },
  { key: "iops", group: "block", metrics: ["rtps", "wtps"], unit: "/s" },
  { key: "blockThroughput", group: "block", metrics: ["rbps", "wbps"], unit: "blocks/s" },
  { key: "netBandwidth", group: "netdev", metrics: ["rxkBps", "txkBps"], unit: "kB/s" },
  { key: "netPackets", group: "netdev", metrics: ["rxpckps", "txpckps"], unit: "/s" },
  {
    key: "netErrors",
    group: "netdev_err",
    metrics: ["rxerrps", "txerrps", "collps", "rxdropps", "txdropps"],
    unit: "/s",
  },
  { key: "diskUtil", group: "blockdev", metrics: ["pct_util"], unit: "%" },
  { key: "diskWait", group: "blockdev", metrics: ["await"], unit: "ms" },
  { key: "diskOps", group: "blockdev", metrics: ["tps"], unit: "/s" },
];

/**
 * The performance statistics of a node, as the historical node stats tab showed
 * them: CPU, load, memory, swap, block I/O, network and block devices, over a
 * period chosen above the charts. A chart without data for the period is left out;
 * a node with no statistics at all says so.
 */
export function NodeStats({ nodeId, locale }: { nodeId: string; locale: string }) {
  const { t } = useTranslation();
  const [days, setDays] = useState<Period>(1);
  const queries = useQueries({
    queries: GROUPS.map((group) => ({
      queryKey: ["node", nodeId, "stats", group, days],
      queryFn: async () => {
        const { data, error } = await api.GET("/nodes/{node_id}/stats", {
          params: { path: { node_id: nodeId }, query: { group, days } },
        });
        if (error !== undefined) throw new Error(problemText(error));
        return data.data;
      },
    })),
  });
  const byGroup = new Map(GROUPS.map((group, index) => [group, queries[index]]));
  const pending = queries.some((query) => query.isPending);
  const failed = queries.find((query) => query.isError);

  const charts = CHARTS.flatMap((chart) => {
    const rows: NodeStatSeries[] = byGroup.get(chart.group)?.data ?? [];
    const series: TimeSeries[] = rows
      .filter((row) => chart.metrics.includes(row.metric) && row.points.length > 0)
      .sort(
        (a, b) =>
          (a.device ?? "").localeCompare(b.device ?? "") ||
          chart.metrics.indexOf(a.metric) - chart.metrics.indexOf(b.metric),
      )
      .map((row) => ({
        key: `${row.device ?? ""}/${row.metric}`,
        name: `${row.device === undefined ? "" : `${row.device} `}${t(`nodes.stats.metrics.${row.metric}`, { defaultValue: row.metric })}`,
        points: row.points.flatMap((p): [number, number][] =>
          p[0] === undefined || p[1] === undefined ? [] : [[p[0], p[1]]],
        ),
      }));
    return series.length === 0 ? [] : [{ ...chart, series }];
  });

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t("nodes.stats.period")} className="flex flex-wrap gap-1">
        {PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={days === period}
            onClick={() => {
              setDays(period);
            }}
            className="h-7 rounded-full border border-line px-3 text-ink-muted hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-ink"
          >
            {t("nodes.stats.days", { count: period })}
          </button>
        ))}
      </div>
      {failed?.isError === true ? (
        <p role="alert" className="text-state-down">
          ■ {failed.error.message}
        </p>
      ) : pending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : charts.length === 0 ? (
        <p className="text-ink-muted">{t("nodes.stats.empty")}</p>
      ) : (
        charts.map((chart) => (
          <section key={chart.key} className="flex flex-col gap-1">
            <h3 className="font-semibold">{t(`nodes.stats.charts.${chart.key}`)}</h3>
            <TimeChart
              series={chart.series}
              stack={chart.stack === true}
              unit={chart.unit}
              locale={locale}
              labels={{
                title: t("nodes.stats.chartLabel", {
                  name: t(`nodes.stats.charts.${chart.key}`),
                  count: days,
                }),
                other: t("reports.preview.other"),
                table: t("reports.preview.chartTable"),
                date: t("reports.preview.date"),
                total: t("reports.preview.total"),
              }}
            />
          </section>
        ))
      )}
    </div>
  );
}
