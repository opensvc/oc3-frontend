import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { copyText } from "@/lib/clipboard";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { ReportView } from "@/components/opensvc/report/ReportView";
import { reportDays } from "@/components/opensvc/report/report-period";
import type { ReaderSearch } from "./reader-search";
import { CodeIcon, LinkIcon, SearchIcon, SidebarIcon } from "@/components/ui/icons";

type ReportRow = components["schemas"]["ReportRow"];

/** The reports the user may read, by name: those published to one of their teams. */
function useReaderReports() {
  return useQuery({
    queryKey: ["reports", "reader"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await api.GET("/reports", {
        params: {
          query: { props: "id,report_name", orderby: "report_name", limit: 0, meta: "0" },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: ReportRow[] = Array.isArray(data.data) ? data.data : [];
      return rows.flatMap((row) =>
        row.id === undefined ? [] : [{ id: String(row.id), name: row.report_name ?? "" }],
      );
    },
  });
}

/**
 * Statistics › Reports: the reports to read, apart from their administration. The
 * list of the reports the user may read on the side, the chosen one rendered next
 * to it, whole. The report lives in the path (`/stats/reports/<id>`), the period
 * of its charts in the search (`days`), a section in the hash: a link shared opens
 * the same page. Nothing is edited here; the definition is a link away, in
 * Administration.
 */
export function ReportReaderPage() {
  const { t } = useTranslation();
  const { reportId } = useParams({ strict: false });
  const search: ReaderSearch = useSearch({ strict: false });
  const navigate = useNavigate();
  const reports = useReaderReports();
  const [query, setQuery] = useState("");
  // Folded, the list leaves its width to the report; the choice lasts the visit.
  const [folded, setFolded] = useState(false);
  const days = reportDays(search.days);

  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (reports.data ?? []).filter((r) => r.name.toLocaleLowerCase().includes(needle));
  }, [reports.data, query]);

  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-start">
      <aside
        aria-label={t("reportView.list")}
        className={`flex shrink-0 flex-col gap-2 md:sticky md:top-4 ${folded ? "md:w-8" : "md:w-60"}`}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-expanded={!folded}
            onClick={() => {
              setFolded(!folded);
            }}
            title={t(folded ? "reportView.unfold" : "reportView.fold")}
            aria-label={t(folded ? "reportView.unfold" : "reportView.fold")}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-(--radius-control) text-ink-muted hover:bg-surface-sunken hover:text-ink md:flex"
          >
            <SidebarIcon open={!folded} className="h-4 w-4" />
          </button>
          {!folded && <h2 className="font-semibold">{t("nav.statReports")}</h2>}
        </div>
        {!folded && (
          <>
            <div className="flex h-8 items-center gap-1.5 rounded-(--radius-control) border border-line bg-surface px-2 text-ink-muted">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder={t("reportView.search")}
                aria-label={t("reportView.search")}
                className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
            {reports.isPending && <p className="text-ink-muted">{t("list.loading")}</p>}
            {reports.isError && (
              <p role="alert" className="text-state-down">
                ■ {reports.error.message}
              </p>
            )}
            {reports.isSuccess && shown.length === 0 && (
              <p className="text-ink-muted">
                {query.trim() === "" ? t("reportView.none") : t("reportView.noMatch")}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {shown.map((report) => (
                <li key={report.id}>
                  <Link
                    to="/stats/reports/$reportId"
                    params={{ reportId: report.id }}
                    search={search.days === undefined ? {} : { days: search.days }}
                    aria-current={report.id === reportId ? "page" : undefined}
                    className="flex items-center gap-2 rounded-(--radius-control) px-2 py-1 text-ink hover:bg-surface-sunken aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium"
                  >
                    <ObjectIcon kind="report" className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{report.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        {reportId === undefined ? (
          <div className="flex flex-col items-start gap-2 py-8">
            <h1 className="flex items-center gap-2 text-title font-semibold">
              <ObjectIcon kind="report" className="h-5 w-5" />
              {t("nav.statReports")}
            </h1>
            <p className="max-w-2xl text-ink-muted">{t("reportView.intro")}</p>
          </div>
        ) : (
          <ReportView
            key={reportId}
            reportId={reportId}
            variant="page"
            days={days}
            onDaysChange={(next) => {
              void navigate({
                to: ".",
                search: (previous) => ({ ...previous, days: next }),
                hash: (previous) => previous ?? "",
                replace: true,
                resetScroll: false,
              });
            }}
            actions={
              <>
                <CopyLinkButton />
                <Link
                  to="/reports"
                  search={{ sel: reportId }}
                  title={t("reportView.definitionHint")}
                  className="flex h-7 items-center gap-1 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink"
                >
                  <CodeIcon className="h-3.5 w-3.5" />
                  {t("reportView.definition")}
                </Link>
              </>
            }
          />
        )}
      </div>
    </section>
  );
}

/** Copies the address of the page, period and section included. */
function CopyLinkButton() {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={() => {
        copyText(window.location.href).then(
          () => {
            setState("copied");
          },
          () => {
            setState("failed");
          },
        );
        window.setTimeout(() => {
          setState("idle");
        }, 2000);
      }}
      className="flex h-7 items-center gap-1 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink"
    >
      <LinkIcon className="h-3.5 w-3.5" />
      <span aria-live="polite">
        {state === "copied"
          ? t("reportView.copied")
          : state === "failed"
            ? t("reportView.copyFailed")
            : t("reportView.copyLink")}
      </span>
    </button>
  );
}
