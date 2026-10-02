import { useState } from "react";
import { ReportView } from "@/components/opensvc/report/ReportView";
import { DEFAULT_REPORT_DAYS } from "@/components/opensvc/report/report-period";

/**
 * The report as its readers see it, in a tab of its detail: the view of the
 * Statistics section, the period of its charts kept by the tab while it is open.
 */
export function ReportPreview({ reportId }: { reportId: string }) {
  const [days, setDays] = useState(DEFAULT_REPORT_DAYS);
  return <ReportView reportId={reportId} variant="preview" days={days} onDaysChange={setDays} />;
}
