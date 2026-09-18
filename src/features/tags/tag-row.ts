import { readProp } from "@/lib/row";

/**
 * Forme d'une ligne de tag.
 *
 * Écart assumé à la règle « corriger la spec côté oc3 plutôt que contourner côté
 * frontend » : `GET /tags` renvoie le `ListResponse` générique, dont les lignes sont
 * typées `Record<string, never>`, et il a été demandé de ne pas toucher à l'API. Le
 * type est donc décrit ici, en un seul endroit, avec une lecture défensive plutôt
 * qu'une conversion aveugle. À supprimer le jour où la spec typera la réponse.
 */
export interface TagRow {
  tag_id: string;
  tag_name: string;
  tag_exclude: string;
  /** Données libres attachées au tag ; l'API les renvoie déjà décodées. */
  tag_data: string;
  tag_created: string;
}

function asText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function toTagRows(data: unknown): TagRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => ({
    tag_id: asText(readProp(row, "tag_id")),
    tag_name: asText(readProp(row, "tag_name")),
    tag_exclude: asText(readProp(row, "tag_exclude")),
    tag_data: asText(readProp(row, "tag_data")),
    tag_created: asText(readProp(row, "tag_created")),
  }));
}
