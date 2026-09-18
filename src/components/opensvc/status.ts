import type { ObjectState } from "./StatusBadge";

/**
 * Traduit un statut du collector en état d'objet OpenSVC.
 * La base stocke "up", "warn", "down", "n/a", et une chaîne vide pour un service
 * qui n'a jamais remonté de statut : les deux derniers sont un état inconnu.
 */
export function toObjectState(value: string | undefined): ObjectState {
  switch (value) {
    case "up":
    case "warn":
    case "down":
      return value;
    default:
      return "unknown";
  }
}

/**
 * Badge d'un statut du collector, valeurs de veille comprises. Comme le collector
 * historique (`cell_decorator_status`), « stdby up » prend la couleur de « up » et
 * « stdby down » celle de « down », et « undef » celle d'un état inconnu ; ces
 * valeurs gardent leur propre libellé, qui en dit plus que l'état seul.
 */
export function statusBadge(value: string | undefined): { state: ObjectState; label?: string } {
  switch (value) {
    case "stdby up":
      return { state: "up", label: value };
    case "stdby down":
      return { state: "down", label: value };
    case "undef":
      return { state: "unknown", label: value };
    default:
      return { state: toObjectState(value) };
  }
}
