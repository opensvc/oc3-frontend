import { reportDays } from "@/components/opensvc/report/report-period";

/** The state of the reader the URL holds, besides the report in its path. */
export interface ReaderSearch {
  days?: number;
}

/** The period of the charts, when the URL gives one of the choices. */
export function parseReaderSearch(raw: Record<string, unknown>): ReaderSearch {
  return raw.days === undefined ? {} : { days: reportDays(raw.days) };
}
