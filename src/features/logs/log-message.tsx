import type { ReactNode } from "react";
import type { ObjectState } from "@/components/opensvc/StatusBadge";

/** Un emplacement `%(clé)s` ou `%(clé)d` du format Python des journaux du collector. */
const PLACEHOLDER = /%\(([^)]+)\)[sd]/g;

/**
 * `log_dict` est un objet JSON sérialisé en chaîne. `null` signale un contenu
 * illisible, à distinguer d'un journal sans valeurs.
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
 * Message d'un journal : `log_fmt` dont chaque emplacement reçoit la valeur de
 * `log_dict`, en gras comme dans le collector historique (`cell_decorator_log_event`).
 * Un emplacement sans valeur reste tel quel ; un `log_dict` illisible laisse le
 * format brut, signalé par `corrupted`.
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
 * Niveau d'un journal vers la forme et la couleur d'un badge d'état, comme les
 * couleurs du collector historique (`cell_decorator_log_level`) : info vert,
 * warning orange, error rouge. Le libellé reste le niveau lui-même.
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
