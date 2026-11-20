import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { rangeProblem, rangeSize } from "./segment-range";
import { useReportDirty } from "@/components/ui/use-report-dirty";

type NetworkRow = components["schemas"]["NetworkRow"];
export type SegmentType = "static" | "dynamic";

/** The properties of a segment a form sets. */
export interface SegmentDraft {
  seg_type: SegmentType;
  seg_begin: string;
  seg_end: string;
}

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2";

const SEGMENT_TYPES: SegmentType[] = ["static", "dynamic"];

/**
 * The type and the range of a segment, to declare one or to change it. The range
 * is checked against the network as the user types; `children` goes above the
 * fields, the network picker of the creation panel say.
 */
export function SegmentForm({
  idPrefix,
  network,
  initial,
  submitLabel,
  submittingLabel,
  pending,
  errorMessage,
  disabled = false,
  onEdit,
  onSubmit,
  onCancel,
  children,
}: {
  /** Prefix of the ids of the inputs, unique in the page. */
  idPrefix: string;
  /** The network holding the segment: the bounds of the range, placeholders too. */
  network: Pick<NetworkRow, "begin" | "end"> | undefined;
  initial?: SegmentDraft;
  submitLabel: string;
  submittingLabel: string;
  pending: boolean;
  errorMessage: string | null;
  disabled?: boolean;
  /** Called on each change of a field: to clear the outcome of a previous submit. */
  onEdit?: () => void;
  onSubmit: (draft: SegmentDraft) => void;
  onCancel?: () => void;
  children?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const [segType, setSegType] = useState<SegmentType>(initial?.seg_type ?? "static");
  const [begin, setBegin] = useState(initial?.seg_begin ?? "");
  const [end, setEnd] = useState(initial?.seg_end ?? "");
  // A range typed keeps the drawer open on a click beside it.
  useReportDirty(
    segType !== (initial?.seg_type ?? "static") ||
      begin !== (initial?.seg_begin ?? "") ||
      end !== (initial?.seg_end ?? ""),
  );

  const problem = network === undefined ? null : rangeProblem(network, begin, end);
  const count = problem === null ? rangeSize(begin, end) : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (problem !== null) return;
    onSubmit({ seg_type: segType, seg_begin: begin.trim(), seg_end: end.trim() });
  }

  const address = (name: "begin" | "end", value: string, set: (value: string) => void) => {
    const id = `${idPrefix}-${name}`;
    const wrong = problem?.field === name;
    return (
      <div>
        <label className="mb-1 block font-medium" htmlFor={id}>
          {t(`networks.segment.fields.seg_${name}`)}
        </label>
        <input
          id={id}
          required
          inputMode="decimal"
          value={value}
          placeholder={network?.[name] ?? ""}
          aria-invalid={wrong}
          aria-describedby={wrong ? `${id}-problem` : undefined}
          onChange={(event) => {
            set(event.target.value);
            onEdit?.();
          }}
          className={`${INPUT} font-mono ${wrong ? "border-state-down" : ""}`}
        />
        {wrong && (
          <p id={`${id}-problem`} className="mt-1 text-state-down">
            ■ {t(`networks.segment.problems.${problem.key}`)}
          </p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={submit}>
      {children}

      <fieldset className="mb-3">
        <legend className="mb-1 font-medium">{t("networks.segment.fields.seg_type")}</legend>
        <div className="grid gap-1">
          {SEGMENT_TYPES.map((type) => (
            <label key={type} className="flex items-start gap-2">
              <input
                type="radio"
                name={`${idPrefix}-type`}
                value={type}
                checked={segType === type}
                onChange={() => {
                  setSegType(type);
                  onEdit?.();
                }}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">{t(`networks.segment.types.${type}`)}</span>
                <span className="block text-ink-muted">
                  {t(`networks.segment.typeHints.${type}`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {address("begin", begin, setBegin)}
        {address("end", end, setEnd)}
      </div>

      {count !== null && (
        <p className="mb-3 rounded-(--radius-control) border border-line bg-surface px-3 py-2 text-data text-ink-muted">
          {t("networks.segment.preview", {
            count,
            formatted: count.toLocaleString(i18n.language),
          })}
        </p>
      )}

      {errorMessage !== null && (
        <p role="alert" className="mb-3 text-state-down">
          ■ {errorMessage}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || disabled}
          className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {pending ? submittingLabel : submitLabel}
        </button>
        {onCancel !== undefined && (
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-(--radius-control) border border-line px-3"
          >
            {t("detail.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
