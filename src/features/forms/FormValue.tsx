import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LegacyCssIcon } from "@/components/opensvc/LegacyCssIcon";
import { parseLegacyCss } from "@/components/opensvc/legacy-css";
import { TargetIcon } from "@/components/ui/icons";
import { conditionsHold, substRefs, type FormDefinition, type FormInput } from "./form-engine";
import { useFormDefinitionByName } from "./use-form";

/**
 * Display mode of the collector forms: a stored value laid out by the form that
 * produced it, as `render_display_mode()` of `init/static/js/osvc/forms.js` shows a
 * compliance rule value. `digest` gives the compact table the lists use; without
 * it, a label per input. A toggle shows the JSON instead, as the `fa-code` icon of
 * the historical box. Read-only: the edit icon of the historical box is not ported.
 */
export function FormValue({
  formName,
  value,
  digest = false,
}: {
  formName: string;
  /** The stored text: JSON most of the time, a plain string otherwise. */
  value: string | undefined;
  digest?: boolean;
}) {
  const { t } = useTranslation();
  const [json, setJson] = useState(false);
  const form = useFormDefinitionByName(formName === "empty" ? "" : formName);
  // A value without form has nothing to lay it out, as in the historical renderer.
  if (formName === "" || formName === "empty" || value === undefined) return null;
  const data = parseValue(value);

  let body;
  if (json) {
    body = <pre className="font-mono whitespace-pre-wrap break-all">{jsonText(data)}</pre>;
  } else if (form.isPending) {
    body = <span className="text-ink-muted">…</span>;
  } else if (form.isError) {
    body = <span className="text-state-down">■ {form.error.message}</span>;
  } else if (form.data === null || form.data === undefined) {
    body = <span className="text-state-down">■ {t("forms.display.notFound")}</span>;
  } else if (typeof data === "string" || typeof data === "number" || formName === "raw") {
    body = <pre className="font-mono whitespace-pre-wrap break-all">{plainText(data)}</pre>;
  } else if (digest) {
    body = <Digest def={form.data} data={data} />;
  } else {
    body = <Normal def={form.data} data={data} />;
  }

  return (
    <div className="relative min-w-64 rounded-(--radius-control) border border-line bg-surface-sunken py-1 pr-12 pl-2">
      <button
        type="button"
        aria-pressed={json}
        title={t(json ? "forms.display.showForm" : "forms.display.showJson")}
        onClick={(event) => {
          // The click belongs to the toggle, not to the row under it.
          event.stopPropagation();
          setJson(!json);
        }}
        className="absolute top-1 right-1 rounded-(--radius-control) border border-line bg-surface px-1 font-mono text-ink-muted hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-ink"
      >
        {"{ }"}
      </button>
      {body}
    </div>
  );
}

/** The value of a sub-form input, laid out by its own form, without toggle. */
function SubFormValue({ formName, data }: { formName: string; data: unknown }) {
  const { t } = useTranslation();
  const form = useFormDefinitionByName(formName);
  if (form.isPending) return <span className="text-ink-muted">…</span>;
  if (form.isError) return <span className="text-state-down">■ {form.error.message}</span>;
  if (form.data === null || form.data === undefined)
    return <span className="text-state-down">■ {t("forms.display.notFound")}</span>;
  return (
    <div className="rounded-(--radius-control) border border-line bg-surface p-1">
      {typeof data === "string" || typeof data === "number" || formName === "raw" ? (
        <pre className="font-mono whitespace-pre-wrap break-all">{plainText(data)}</pre>
      ) : (
        <Normal def={form.data} data={data} />
      )}
    </div>
  );
}

function parseValue(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function plainText(data: unknown): string {
  return typeof data === "string" || typeof data === "number" ? String(data) : jsonText(data);
}

/** The JSON view: indented by four, as the historical toggle shows it. */
function jsonText(data: unknown): string {
  return typeof data === "string" || typeof data === "number"
    ? String(data)
    : JSON.stringify(data, null, 4);
}

/**
 * A value as text: String() as the historical renderer does, arrays joined by
 * commas included, except that a nested object shows as JSON rather than
 * "[object Object]".
 */
function cellText(v: unknown): string {
  if (typeof v === "object" && v !== null && !Array.isArray(v)) return JSON.stringify(v);
  return String(v);
}

/** An empty value shows as a dash; a long one is cut in its middle past DisplayModeTrim. */
function shown(content: string, input: FormInput): string {
  if (content === "") return "-";
  const trim = input.displayModeTrim;
  if (trim > 0 && content.length > trim) {
    return `${content.slice(0, trim / 3)}...${content.slice(content.length - (trim / 3) * 2)}`;
  }
  return content;
}

function labelOf(input: FormInput): string {
  return input.displayModeLabel === "" ? input.label : input.displayModeLabel;
}

/**
 * The digest: one column per input, one line per entry of a list or a dict of
 * dicts, as `render_display_digest()`. A dict has no digest and falls back to the
 * normal layout.
 */
function Digest({ def, data }: { def: FormDefinition; data: unknown }) {
  const format = def.output?.format ?? "dict";
  if (format === "dict") return <Normal def={def} data={data} />;
  const seen = new Set<string>();
  const inputs = def.inputs.filter((input) => {
    if (input.hidden || !input.displayInDigest) return false;
    // One column per key, as the historical header dedupes them.
    if (seen.has(input.key)) return false;
    seen.add(input.key);
    return true;
  });
  const first = def.inputs[0];
  let lines: { item: unknown; key?: string }[] = [];
  if (format === "list" || format === "list of dict") {
    lines = Array.isArray(data) ? data.map((item: unknown) => ({ item })) : [];
  } else if (format === "dict of dict" && isRecord(data)) {
    lines = Object.entries(data).map(([key, item]) => ({ item, key }));
  }
  const keyInput = def.output?.key ?? "";
  return (
    <table className="text-data">
      <thead>
        <tr>
          {inputs.map((input) => (
            <th key={input.id} className="pr-3 text-left font-semibold whitespace-nowrap">
              <span className="inline-flex items-center gap-1">
                {input === first && (
                  <TargetIcon className="h-3.5 w-3.5 shrink-0 text-icon-compliance" />
                )}
                {labelOf(input)}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map(({ item, key }, i) => (
          <tr key={key ?? i}>
            {inputs.map((input) => {
              const record = isRecord(item) ? item : {};
              // The historical renderer drops the cell of an input whose condition
              // fails, shifting the next ones: an empty cell keeps the columns aligned.
              if (!conditionsHold(input, record)) return <td key={input.id} />;
              if (key !== undefined && input.key === keyInput) {
                return (
                  <td key={input.id} className="pr-3 align-top font-semibold">
                    {shown(key, input)}
                  </td>
                );
              }
              if (typeof item === "string") {
                return (
                  <td key={input.id} className="pr-3 align-top">
                    <span className="inline-flex items-center gap-1">
                      <LegacyCssIcon css={`${input.css} ${input.labelCss}`} className="h-3.5 w-3.5" />
                      {shown(item, input)}
                    </span>
                  </td>
                );
              }
              const content = input.key in record ? cellText(record[input.key]) : "";
              return (
                <td key={input.id} className="pr-3 align-top">
                  {shown(content, input)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The normal layout: a label and a value per input, for each entry of a list, as
 * `render_display_normal()`. Sub-forms are laid out by their own form.
 */
function Normal({ def, data }: { def: FormDefinition; data: unknown }) {
  const entries: unknown[] = Array.isArray(data) ? data : [data];
  return (
    <div className="text-data">
      {entries.map((entry, i) => (
        <div key={i}>
          {i > 0 && def.inputs.length > 1 && <hr className="my-1 border-line" />}
          <NormalDict def={def} data={isRecord(entry) ? entry : {}} />
        </div>
      ))}
    </div>
  );
}

function NormalDict({ def, data }: { def: FormDefinition; data: Record<string, unknown> }) {
  return (
    <table>
      <tbody>
        {def.inputs.map((input) => {
          if (input.hidden || !conditionsHold(input, data)) return null;
          const label = (
            <th className="w-[30%] pr-3 text-left align-top font-semibold whitespace-nowrap">
              <span className="inline-flex items-center gap-1">
                <LegacyCssIcon css={input.labelCss} className="h-3.5 w-3.5" />
                {labelOf(input)}
              </span>
            </th>
          );
          if (input.type === "form") {
            const sub = data[input.key];
            // Empty sub-form data is not shown, to save space.
            if (sub === undefined || sub === null || sub === "" || isEmptyContainer(sub))
              return null;
            return (
              <tr key={input.id}>
                {label}
                <td className="align-top">
                  <SubFormValue formName={input.subForm} data={sub} />
                </td>
              </tr>
            );
          }
          if (input.format !== "") {
            return (
              <tr key={input.id}>
                {label}
                <td className="align-top">{substRefs(data, input.format)}</td>
              </tr>
            );
          }
          const content = input.key in data ? cellText(data[input.key]) : "";
          const pre = parseLegacyCss(input.css).pre;
          return (
            <tr key={input.id}>
              {label}
              <td className="align-top">
                <span className="inline-flex items-start gap-1">
                  <LegacyCssIcon css={input.css} className="mt-0.5 h-3.5 w-3.5" />
                  <span className={pre ? "font-mono whitespace-pre-wrap break-all" : "break-words"}>
                    {shown(content, input)}
                  </span>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function isEmptyContainer(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  return isRecord(v) && Object.keys(v).length === 0;
}
