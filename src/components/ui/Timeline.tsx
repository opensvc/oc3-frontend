import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatDuration } from "@/lib/format";

/** A period on the timeline, in seconds since the epoch; `ongoing` runs to now. */
export interface TimelineRange {
  key: string;
  start: number;
  end: number;
  ongoing?: boolean;
}

/** The words of the timeline, translated by the caller. */
export interface TimelineLabels {
  /** Accessible name of the chart. */
  title: string;
  /** Text of an ongoing range end, such as "ongoing". */
  ongoing: string;
  start: string;
  end: string;
  duration: string;
  showTable: string;
}

const HEIGHT = 56;
const TRACK = { top: 8, height: 24 };
const PAD = { left: 8, right: 8 };
/** A range drawn narrower would not be seen: one of a few seconds over weeks. */
const MIN_WIDTH = 3;

/**
 * Periods on a time axis, such as the occurrences of an alert: a bar per period
 * on one track, from the first period to now. Hovering a bar, or stepping
 * through them with the arrow keys once the chart has the focus, shows its start,
 * end and duration; an ongoing period runs to the right edge, its end read as
 * ongoing. A table lists the same periods, for whoever cannot read the chart.
 */
export function Timeline({
  ranges,
  now,
  labels,
  locale,
}: {
  ranges: TimelineRange[];
  now: number;
  labels: TimelineLabels;
  locale: string;
}) {
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

  const first = Math.min(now - 3600, ...ranges.map((r) => r.start));
  const span = Math.max(1, now - first);
  const inner = width - PAD.left - PAD.right;
  const x = (t: number) => PAD.left + ((t - first) / span) * inner;
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" });
  const axisFormat = new Intl.DateTimeFormat(
    locale,
    span <= 2 * 86400 ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" },
  );
  const tickCount = Math.max(2, Math.min(6, Math.floor(inner / 110)));
  const ticks = Array.from({ length: tickCount }, (_, i) => first + (span * i) / (tickCount - 1));
  const shown = active === null ? undefined : ranges[active];
  const endText = (r: TimelineRange) =>
    r.ongoing === true ? labels.ongoing : dateTime.format(new Date(r.end * 1000));

  function nearest(clientX: number): number | null {
    const element = box.current;
    if (element === null || ranges.length === 0) return null;
    const px = clientX - element.getBoundingClientRect().left;
    let best = 0;
    let bestDistance = Infinity;
    ranges.forEach((r, i) => {
      const left = x(r.start);
      const right = Math.max(x(r.end), left + MIN_WIDTH);
      const distance = px < left ? left - px : px > right ? px - right : 0;
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    // Beyond a few pixels of any bar, nothing is pointed at.
    return bestDistance <= 6 ? best : null;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (ranges.length === 0) return;
    const last = ranges.length - 1;
    const next =
      event.key === "ArrowRight"
        ? Math.min(last, (active ?? -1) + 1)
        : event.key === "ArrowLeft"
          ? Math.max(0, (active ?? ranges.length) - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) {
      if (event.key === "Escape" && active !== null) {
        event.stopPropagation();
        setActive(null);
      }
      return;
    }
    event.preventDefault();
    setActive(next);
  }

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div
        ref={box}
        role="img"
        aria-label={labels.title}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={(event) => {
          setActive(nearest(event.clientX));
        }}
        onPointerLeave={() => {
          setActive(null);
        }}
        onBlur={() => {
          setActive(null);
        }}
        className="relative rounded-(--radius-control) focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg width={width} height={HEIGHT} aria-hidden="true" className="block">
          <rect
            x={PAD.left}
            y={TRACK.top}
            width={inner}
            height={TRACK.height}
            rx={4}
            className="fill-surface-sunken"
          />
          {ranges.map((r, i) => {
            const left = x(r.start);
            const w = Math.max(MIN_WIDTH, x(r.end) - left);
            return (
              <rect
                key={r.key}
                x={Math.min(left, PAD.left + inner - w)}
                y={TRACK.top}
                width={w}
                height={TRACK.height}
                rx={2}
                className={`fill-state-down ${active === i ? "" : active === null ? "opacity-80" : "opacity-40"}`}
              />
            );
          })}
          {ticks.map((t, i) => (
            <text
              key={t}
              x={x(t)}
              y={HEIGHT - 4}
              textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
              className="fill-ink-muted text-[0.6875rem]"
            >
              {axisFormat.format(new Date(t * 1000))}
            </text>
          ))}
        </svg>
        {shown !== undefined && (
          <div
            role="status"
            className="pointer-events-none absolute top-full z-10 mt-1 rounded-(--radius-control) border border-line bg-surface-raised px-2 py-1 text-data shadow"
            style={{ left: Math.min(Math.max(0, x(shown.start) - 40), width - 220) }}
          >
            <div>
              <span className="text-ink-muted">{labels.start} </span>
              {dateTime.format(new Date(shown.start * 1000))}
            </div>
            <div>
              <span className="text-ink-muted">{labels.end} </span>
              {endText(shown)}
            </div>
            <div>
              <span className="text-ink-muted">{labels.duration} </span>
              {formatDuration(shown.end - shown.start, locale)}
            </div>
          </div>
        )}
      </div>
      <details className="text-data">
        <summary className="cursor-pointer text-ink-muted">{labels.showTable}</summary>
        <table className="mt-1 w-full">
          <thead>
            <tr className="text-left text-ink-muted">
              <th className="py-0.5 pr-3 font-normal">{labels.start}</th>
              <th className="py-0.5 pr-3 font-normal">{labels.end}</th>
              <th className="py-0.5 font-normal">{labels.duration}</th>
            </tr>
          </thead>
          <tbody>
            {[...ranges].reverse().map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="py-0.5 pr-3">{dateTime.format(new Date(r.start * 1000))}</td>
                <td className="py-0.5 pr-3">{endText(r)}</td>
                <td className="py-0.5">{formatDuration(r.end - r.start, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
