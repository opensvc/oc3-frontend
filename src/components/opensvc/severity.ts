/**
 * Sévérité d'une entrée du dashboard. Le collector la stocke en entier de 0 à 5
 * sans libellé : on garde donc le chiffre affiché, et on n'ajoute qu'un palier de
 * lecture. Comme pour les états d'objet, chaque palier a sa forme propre, pour
 * rester lisible sans la couleur.
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
