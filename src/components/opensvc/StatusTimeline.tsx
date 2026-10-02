import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { parseCollectorDate } from "@/lib/format";
import { Timeline, type TimelineRange, type TimelineTrack } from "@/components/ui/Timeline";
import { statusBadge } from "./status";

/** A period of the status log: its dates, and the value of each status then. */
export interface StatusLogPeriod {
  begin: string;
  end: string;
  values: Record<string, string>;
}

const PERIODS = [1, 7, 30] as const;
type Period = (typeof PERIODS)[number];

/**
 * The last period is the current status, extended to now when the last status was
 * received recently; an older one means the object stopped reporting, which is
 * left as a hole rather than drawn as if the status held.
 */
const FRESH = 15 * 60;

const seconds = (value: string) => {
  const date = parseCollectorDate(value);
  return date === null ? null : Math.floor(date.getTime() / 1000);
};

/**
 * Ranges of one status of the log: consecutive periods of the same value merged,
 * the colour of the value as its badge has it, the value itself as the label.
 */
function rangesOf(periods: StatusLogPeriod[], key: string, now: number): TimelineRange[] {
  const ranges: TimelineRange[] = [];
  periods.forEach((period, index) => {
    const start = seconds(period.begin);
    let end = seconds(period.end);
    const value = period.values[key];
    if (start === null || end === null || value === undefined) return;
    const last = index === periods.length - 1;
    const ongoing = last && now - end < FRESH;
    if (ongoing) end = now;
    const previous = ranges[ranges.length - 1];
    // Contiguous periods of the same value are one range: within a minute.
    if (previous !== undefined && previous.label === value && start - previous.end <= 60) {
      previous.end = Math.max(previous.end, end);
      previous.ongoing = ongoing;
      return;
    }
    const badge = statusBadge(value);
    ranges.push({
      key: `${key}/${String(start)}`,
      start,
      end,
      ongoing,
      tone: badge.state,
      label: value === "" ? "n/a" : value,
    });
  });
  return ranges;
}

/**
 * The status history of an object on a time axis, over a period chosen above it:
 * a track per status the log keeps (availability, overall), coloured and named by
 * value, as the status badges of the views.
 */
export function StatusTimeline({
  queryKey,
  load,
  tracks,
  locale,
}: {
  queryKey: readonly unknown[];
  load: (days: number) => Promise<StatusLogPeriod[]>;
  /** The statuses to draw, a track each, in order; a lone one is not named. */
  tracks: { key: string; label: string }[];
  locale: string;
}) {
  const { t } = useTranslation();
  const [days, setDays] = useState<Period>(7);
  const log = useQuery({
    queryKey: [...queryKey, days],
    queryFn: () => load(days),
  });
  const now = Math.floor(Date.now() / 1000);

  let body;
  if (log.isPending) body = <p className="text-ink-muted">{t("list.loading")}</p>;
  else if (log.isError)
    body = (
      <p role="alert" className="text-state-down">
        ■ {log.error.message}
      </p>
    );
  else if (log.data.length === 0)
    body = <p className="text-ink-muted">{t("statusTimeline.empty")}</p>;
  else {
    const timelineTracks: TimelineTrack[] = tracks.map((track) => ({
      key: track.key,
      label: tracks.length > 1 ? track.label : undefined,
      ranges: rangesOf(log.data, track.key, now),
    }));
    body = (
      <Timeline
        tracks={timelineTracks}
        now={now}
        from={now - days * 86400}
        locale={locale}
        labels={{
          title: t("statusTimeline.title"),
          ongoing: t("statusTimeline.ongoing"),
          start: t("statusTimeline.start"),
          end: t("statusTimeline.end"),
          duration: t("statusTimeline.duration"),
          showTable: t("statusTimeline.showTable"),
          status: t("statusTimeline.status"),
          track: t("statusTimeline.track"),
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-data font-medium text-ink-muted">{t("statusTimeline.title")}</h4>
        <div role="group" aria-label={t("statusTimeline.period")} className="ml-auto flex gap-1">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={days === period}
              onClick={() => {
                setDays(period);
              }}
              className="h-6 rounded-full border border-line px-2.5 text-data text-ink-muted hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-ink"
            >
              {t("statusTimeline.days", { count: period })}
            </button>
          ))}
        </div>
      </div>
      {body}
    </div>
  );
}
