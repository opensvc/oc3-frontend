/**
 * Formatage des valeurs du collector. Les unités et les formats de date viennent
 * de la base historique : c'est ici qu'on absorbe leurs particularités.
 */

/**
 * Tailles stockées en mébioctets par le collector, quel que soit le nom de la
 * colonne : `mem_bytes` vaut 4096 sur un node de 4 Gio, et `disk_size` 40960 sur un
 * disque de 40 Gio.
 */
export function formatSizeMiB(value: number | undefined, locale: string): string {
  if (value === undefined || value <= 0) return "";
  // Sous le gibioctet, en mébioctets : 16 Mio affichés « 0 GiB » ne diraient rien.
  if (value < 1024) return `${value.toLocaleString(locale, { maximumFractionDigits: 0 })} MiB`;
  const gib = value / 1024;
  return `${gib.toLocaleString(locale, { maximumFractionDigits: gib < 10 ? 1 : 0 })} GiB`;
}

/**
 * Le collector renvoie « 2026-09-15 15:06:23.000 », qui n'est pas de l'ISO 8601 :
 * sans le T, Safari refuse de la parser.
 *
 * L'horodatage ne porte aucun fuseau : il est interprété dans celui du navigateur,
 * donc juste tant que le navigateur est à l'heure du collector. Voir notes.md.
 */
export function parseCollectorDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") return null;
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Date et heure localisées, ou la valeur telle quelle si elle n'en est pas une. */
export function formatDateTime(value: string | undefined, locale: string): string {
  if (value === undefined || value === "") return "";
  const parsed = parseCollectorDate(value);
  if (parsed === null) return value;
  return parsed.toLocaleString(locale, { dateStyle: "short", timeStyle: "medium" });
}

/**
 * Date seule, localisée, pour les échéances dont l'heure ne dit rien : les dates
 * d'obsolescence sont saisies au jour et stockées à minuit.
 */
export function formatDate(value: string | undefined, locale: string): string {
  if (value === undefined || value === "") return "";
  const parsed = parseCollectorDate(value);
  if (parsed === null) return value;
  return parsed.toLocaleDateString(locale, { dateStyle: "medium" });
}

/** Paliers du plus grand au plus petit, en secondes. */
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

/**
 * Écart à maintenant, en toutes lettres : « il y a 5 minutes », « hier ».
 *
 * L'unité retenue est la plus grande qui tienne, et l'écart est tronqué plutôt
 * qu'arrondi : à 90 secondes on lit « il y a 1 minute » et non « il y a 2 minutes »,
 * pour ne jamais annoncer un contact plus ancien qu'il ne l'est.
 */
export function formatRelativeTime(
  value: string | undefined,
  locale: string,
  now: number = Date.now(),
): string {
  if (value === undefined || value === "") return "";
  const parsed = parseCollectorDate(value);
  if (parsed === null) return value;
  const seconds = (parsed.getTime() - now) / 1000;
  const absolute = Math.abs(seconds);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (absolute >= size || unit === "second") {
      return format.format(Math.trunc(seconds / size), unit);
    }
  }
  return "";
}
