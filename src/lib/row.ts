/**
 * Lecture d'un prop par son nom sur une ligne d'API.
 *
 * Les lignes sont des objets plats dont les clés sont les props du collector.
 * TypeScript ne sait pas les indexer par une chaîne quelconque, d'où cette
 * conversion, isolée ici plutôt que répétée.
 */
export function readProp<T>(row: T, prop: string): unknown {
  return (row as Record<string, unknown>)[prop];
}

/** Même lecture, ramenée à une chaîne éditable. */
export function readPropAsString<T>(row: T, prop: string): string {
  const value = readProp(row, prop);
  return value === undefined || value === null ? "" : String(value);
}
