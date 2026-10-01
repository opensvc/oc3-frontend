import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface TimeSeries {
  key: string;
  name: string;
  /** [unix time in seconds, value], oldest first. */
  points: [number, number][];
}

/** The labels of the chart, translated by the caller. */
export interface TimeChartLabels {
  /** Accessible name of the chart. */
  title: string;
  /** Name of the row the folded series are summed into. */
  other: string;
  /** Summary of the disclosure holding the table of the values. */
  table: string;
  date: string;
  total: string;
}

/** The series colours, in their fixed order; written out in full for Tailwind. */
const STROKE = [
  "stroke-series-1",
  "stroke-series-2",
  "stroke-series-3",
  "stroke-series-4",
  "stroke-series-5",
  "stroke-series-6",
  "stroke-series-7",
  "stroke-series-8",
];
const FILL = [
  "fill-series-1",
  "fill-series-2",
  "fill-series-3",
  "fill-series-4",
  "fill-series-5",
  "fill-series-6",
  "fill-series-7",
  "fill-series-8",
];
const BG = [
  "bg-series-1",
  "bg-series-2",
  "bg-series-3",
  "bg-series-4",
  "bg-series-5",
  "bg-series-6",
  "bg-series-7",
  "bg-series-8",
];
const SLOTS = STROKE.length;

const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 24, left: 48 };

/**
 * Up to eight series keep their own colour, in a fixed order; beyond, the last
 * ones are summed into an "Other" series rather than given a ninth colour.
 */
function capSeries(series: TimeSeries[], otherName: string): TimeSeries[] {
  if (series.length <= SLOTS) return series;
  const kept = series.slice(0, SLOTS - 1);
  const sums = new Map<number, number>();
  for (const s of series.slice(SLOTS - 1))
    for (const [t, v] of s.points) sums.set(t, (sums.get(t) ?? 0) + v);
  const points = [...sums.entries()].sort((a, b) => a[0] - b[0]);
  return [...kept, { key: "__other", name: otherName, points }];
}

/** Round axis values: 1, 2 or 5 times a power of ten. */
function niceStep(max: number, count: number): number {
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

/**
 * A time series chart drawn in SVG: one line per series, or stacked areas, against
 * a single value axis from zero. A crosshair follows the pointer — or the arrow
 * keys once the chart has the focus — snapping to the nearest date, and a tooltip
 * lists every series at that date. With two series or more a legend names them;
 * the values are also in a table under the chart, so that nothing depends on the
 * colours or on hovering.
 */
export function TimeChart({
  series: input,
  stack,
  unit,
  labels,
  locale,
}: {
  series: TimeSeries[];
  stack: boolean;
  unit?: string;
  labels: TimeChartLabels;
  locale: string;
}) {
  const series = useMemo(() => capSeries(input, labels.other), [input, labels.other]);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = box.current;
    if (element === null) return;
    const observer = new ResizeObserver(() => {
      setWidth(Math.max(240, element.clientWidth));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Every date of every series, and each series' value at it.
  const dates = useMemo(
    () => [...new Set(series.flatMap((s) => s.points.map(([t]) => t)))].sort((a, b) => a - b),
    [series],
  );
  const values = useMemo(
    () => series.map((s) => new Map(s.points.map(([t, v]) => [t, v]))),
    [series],
  );
  // Stacked: each series sits on the sum of those before it.
  const tops = useMemo(
    () =>
      dates.map((t) => {
        let sum = 0;
        return values.map((byDate) => {
          sum += stack ? (byDate.get(t) ?? 0) : 0;
          return sum;
        });
      }),
    [dates, values, stack],
  );

  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  // Points closer than a day carry their time: the axis and the tooltip show it.
  const intraday = dates.some((t, i) => i > 0 && t - (dates[i - 1] ?? t) < 24 * 3600);
  const shortSpan = (dates[dates.length - 1] ?? 0) - (dates[0] ?? 0) <= 2 * 24 * 3600;
  const dayFormat = new Intl.DateTimeFormat(
    locale,
    shortSpan && intraday
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric" },
  );
  const fullDate = new Intl.DateTimeFormat(
    locale,
    intraday ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" },
  );

  const innerWidth = width - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const first = dates[0] ?? 0;
  const last = dates[dates.length - 1] ?? 1;
  const max = Math.max(
    1,
    ...(stack
      ? tops.map((row) => row[row.length - 1] ?? 0)
      : values.flatMap((byDate) => [...byDate.values()])),
  );
  const step = niceStep(max, 4);
  const top = Math.ceil(max / step) * step;
  const x = (t: number) =>
    PAD.left + (last === first ? innerWidth / 2 : ((t - first) / (last - first)) * innerWidth);
  const y = (v: number) => PAD.top + innerHeight - (v / top) * innerHeight;
  const yTicks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const xTickCount = Math.max(2, Math.min(6, Math.floor(innerWidth / 110)));
  const xTicks =
    dates.length === 0
      ? []
      : Array.from(
          { length: xTickCount },
          (_, i) => first + ((last - first) * i) / (xTickCount - 1),
        );

  const paths = series.map((s, index) => {
    if (stack) {
      const upper = dates.map((t, at) => `${String(x(t))},${String(y(tops[at]?.[index] ?? 0))}`);
      const lower = dates
        .map(
          (t, at) =>
            `${String(x(t))},${String(y((tops[at]?.[index] ?? 0) - (values[index]?.get(t) ?? 0)))}`,
        )
        .reverse();
      return { line: `M${upper.join("L")}`, area: `M${upper.join("L")}L${lower.join("L")}Z` };
    }
    const line = s.points.map(([t, v]) => `${String(x(t))},${String(y(v))}`);
    return { line: line.length === 0 ? "" : `M${line.join("L")}`, area: "" };
  });

  function nearest(clientX: number): number | null {
    const element = box.current;
    if (element === null || dates.length === 0) return null;
    const left = element.getBoundingClientRect().left;
    const t = first + ((clientX - left - PAD.left) / innerWidth) * (last - first);
    let best = 0;
    for (let i = 1; i < dates.length; i++)
      if (Math.abs((dates[i] ?? 0) - t) < Math.abs((dates[best] ?? 0) - t)) best = i;
    return best;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (dates.length === 0) return;
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : dates.length - 1);
      return;
    }
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    setActive((current) =>
      Math.min(dates.length - 1, Math.max(0, (current ?? dates.length - 1) + move)),
    );
  }

  const activeDate = active === null ? undefined : dates[active];
  const format = (v: number) =>
    `${number.format(v)}${unit === undefined || unit === "" ? "" : ` ${unit}`}`;

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div
        ref={box}
        role="img"
        aria-label={labels.title}
        tabIndex={0}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
          setActive(nearest(event.clientX));
        }}
        onPointerLeave={() => {
          setActive(null);
        }}
        onFocus={() => {
          setActive((current) => current ?? (dates.length === 0 ? null : dates.length - 1));
        }}
        onBlur={() => {
          setActive(null);
        }}
        onKeyDown={onKeyDown}
        className="relative rounded-(--radius-control) outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg width={width} height={HEIGHT} aria-hidden="true" className="block">
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(v)}
                y2={y(v)}
                className="stroke-line"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-ink-muted text-[0.6875rem]"
              >
                {number.format(v)}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={x(t)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              className="fill-ink-muted text-[0.6875rem]"
            >
              {dayFormat.format(new Date(t * 1000))}
            </text>
          ))}
          {paths.map((path, index) =>
            stack ? (
              <path
                key={`a${String(index)}`}
                d={path.area}
                className={`${FILL[index] ?? ""} opacity-20`}
              />
            ) : null,
          )}
          {paths.map((path, index) => (
            <path
              key={`l${String(index)}`}
              d={path.line}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={STROKE[index]}
            />
          ))}
          {/* A series of one point has no line to draw: its point stands alone. */}
          {series.map((s, index) =>
            s.points.length === 1 && s.points[0] !== undefined ? (
              <circle
                key={`p${s.key}`}
                cx={x(s.points[0][0])}
                cy={y(stack ? (tops[dates.indexOf(s.points[0][0])]?.[index] ?? 0) : s.points[0][1])}
                r={4}
                strokeWidth={2}
                className={`${FILL[index] ?? ""} stroke-surface`}
              />
            ) : null,
          )}
          {activeDate !== undefined && (
            <g>
              <line
                x1={x(activeDate)}
                x2={x(activeDate)}
                y1={PAD.top}
                y2={PAD.top + innerHeight}
                className="stroke-ink-muted"
                strokeWidth={1}
              />
              {series.map((s, index) => {
                const value = values[index]?.get(activeDate);
                if (value === undefined) return null;
                const at = dates.indexOf(activeDate);
                return (
                  <circle
                    key={s.key}
                    cx={x(activeDate)}
                    cy={y(stack ? (tops[at]?.[index] ?? 0) : value)}
                    r={4}
                    strokeWidth={2}
                    className={`${FILL[index] ?? ""} stroke-surface`}
                  />
                );
              })}
            </g>
          )}
        </svg>
        {activeDate !== undefined && (
          <div
            // The values are in the table below for assistive technologies.
            aria-hidden="true"
            className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-(--radius-control) border border-line bg-surface-raised px-2 py-1.5 text-data shadow-lg"
            style={
              x(activeDate) > width / 2
                ? { right: width - x(activeDate) + 8 }
                : { left: x(activeDate) + 8 }
            }
          >
            <div className="mb-1 text-ink-muted">
              {fullDate.format(new Date(activeDate * 1000))}
            </div>
            {series.map((s, index) => {
              const value = values[index]?.get(activeDate);
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span aria-hidden="true" className={`h-0.5 w-3 shrink-0 ${BG[index] ?? ""}`} />
                  <span className="font-semibold tabular-nums">
                    {value === undefined ? "—" : format(value)}
                  </span>
                  <span className="truncate text-ink-muted">{s.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {series.length > 1 && (
        <figcaption className="flex flex-wrap gap-x-3 gap-y-1 text-data text-ink-muted">
          {series.map((s, index) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-0.5 w-4 ${BG[index] ?? ""}`} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <details className="text-data">
        <summary className="cursor-pointer text-ink-muted hover:text-ink">{labels.table}</summary>
        <div className="mt-1 max-h-60 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                <th scope="col" className="px-1.5 py-1 font-medium">
                  {labels.date}
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="px-1.5 py-1 text-right font-medium">
                    {s.name}
                  </th>
                ))}
                {stack && series.length > 1 && (
                  <th scope="col" className="px-1.5 py-1 text-right font-medium">
                    {labels.total}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {[...dates].reverse().map((t) => {
                const at = dates.indexOf(t);
                return (
                  <tr key={t} className="border-b border-line last:border-b-0">
                    <th scope="row" className="px-1.5 py-0.5 text-left font-normal">
                      {fullDate.format(new Date(t * 1000))}
                    </th>
                    {series.map((s, index) => {
                      const value = values[index]?.get(t);
                      return (
                        <td key={s.key} className="px-1.5 py-0.5 text-right tabular-nums">
                          {value === undefined ? "—" : number.format(value)}
                        </td>
                      );
                    })}
                    {stack && series.length > 1 && (
                      <td className="px-1.5 py-0.5 text-right tabular-nums">
                        {number.format(tops[at]?.[series.length - 1] ?? 0)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
