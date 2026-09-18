import { DateStamp } from "@/components/ui/DateTime";
import { formatDateTime, formatRelativeTime, parseCollectorDate } from "@/lib/format";

/**
 * Horodatage en écart à maintenant, l'instant exact restant lisible en infobulle.
 *
 * Dans une liste, « il y a 3 minutes » se compare d'un coup d'œil là où une date
 * complète demande une soustraction mentale ; la date complète reste accessible au
 * survol, et dans `dateTime` pour les outils qui lisent la page.
 */
export function RelativeTime({ value, locale }: { value: string | undefined; locale: string }) {
  const parsed = parseCollectorDate(value);
  const exact = formatDateTime(value, locale);
  // Valeur vide ou illisible : rien à situer dans le temps, on rend le texte brut.
  if (parsed === null) return exact;
  return (
    <DateStamp date={parsed} title={exact}>
      {formatRelativeTime(value, locale)}
    </DateStamp>
  );
}
