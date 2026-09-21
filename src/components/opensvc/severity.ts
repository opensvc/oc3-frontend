/**
 * Severity of a dashboard entry. The collector stores it as an integer from 0 to 5
 * with no label: the number is therefore kept on display, and only a reading tier is
 * added. As for object states, each tier has its own shape, to stay readable without
 * colour.
 */
export const SEVERITY_LEVELS = [
  { min: 3, box: "bg-state-down-soft text-state-down", glyph: "■", key: "critical" },
  { min: 2, box: "bg-state-warn-soft text-state-warn", glyph: "▲", key: "warning" },
  { min: 0, box: "bg-state-unknown-soft text-state-unknown", glyph: "○", key: "info" },
] as const;

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export function severityLevel(severity: number): SeverityLevel {
  return SEVERITY_LEVELS.find((candidate) => severity >= candidate.min) ?? SEVERITY_LEVELS[2];
}
