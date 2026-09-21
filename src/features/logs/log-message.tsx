import type { ReactNode } from "react";
import type { ObjectState } from "@/components/opensvc/StatusBadge";

/** A `%(key)s` or `%(key)d` placeholder of the Python format of the collector logs. */
const PLACEHOLDER = /%\(([^)]+)\)[sd]/g;

/**
 * `log_dict` is a JSON object serialised as a string. `null` signals unreadable
 * content, to be told apart from a log entry without values.
 */
function parseDict(dict: string | null | undefined): Record<string, unknown> | null {
  if (dict === null || dict === undefined || dict === "") return {};
  try {
    const parsed: unknown = JSON.parse(dict);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function valueText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value as number | boolean);
}

/**
 * Message of a log entry: `log_fmt` with each placeholder receiving the value from
 * `log_dict`, in bold as in the historical collector
 * (`cell_decorator_log_event`). A placeholder without a value stays as it is; an
 * unreadable `log_dict` leaves the raw format, signalled by `corrupted`.
 */
export function formatLogMessage(
  fmt: string | undefined,
  dict: string | null | undefined,
): { parts: ReactNode[]; text: string; corrupted: boolean } {
  const template = fmt ?? "";
  const values = parseDict(dict);
  if (values === null) return { parts: [template], text: template, corrupted: true };
  const parts: ReactNode[] = [];
  let text = "";
  let last = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    const [placeholder, key] = match;
    const index = match.index;
    const before = template.slice(last, index);
    parts.push(before);
    text += before;
    if (key !== undefined && key in values) {
      const value = valueText(values[key]);
      parts.push(<b key={`${String(index)}-${key}`}>{value}</b>);
      text += value;
    } else {
      parts.push(placeholder);
      text += placeholder;
    }
    last = index + placeholder.length;
  }
  parts.push(template.slice(last));
  text += template.slice(last);
  return { parts, text, corrupted: false };
}

/**
 * Level of a log entry to the shape and colour of a state badge, like the colours of
 * the historical collector (`cell_decorator_log_level`): info green, warning orange,
 * error red. The label stays the level itself.
 */
export function logLevelState(level: string | undefined): ObjectState {
  switch (level) {
    case "info":
      return "up";
    case "warning":
      return "warn";
    case "error":
      return "down";
    default:
      return "unknown";
  }
}
