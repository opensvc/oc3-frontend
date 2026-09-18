import type { ReactNode } from "react";
import { CalendarIcon } from "@/components/ui/icons";
import { formatDate, formatDateTime, parseCollectorDate } from "@/lib/format";

/**
 * Mise en forme commune des horodatages de liste : une icône de calendrier devant la
 * valeur, qui signale une date au premier regard quel que soit son format, absolu ou
 * relatif. Le tout reste sur une ligne pour que l'icône ne se retrouve pas seule.
 */
export function DateStamp({
  date,
  title,
  children,
}: {
  date: Date;
  title?: string;
  children: ReactNode;
}) {
  return (
    <time
      dateTime={date.toISOString()}
      title={title}
      className="inline-flex items-center gap-1 whitespace-nowrap"
    >
      <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      {children}
    </time>
  );
}

/**
 * Date et heure localisées, précédées de l'icône de calendrier. `dateOnly` omet
 * l'heure, pour une échéance au jour.
 */
export function DateTime({
  value,
  locale,
  dateOnly = false,
}: {
  value: string | undefined;
  locale: string;
  dateOnly?: boolean;
}) {
  const parsed = parseCollectorDate(value);
  const text = dateOnly ? formatDate(value, locale) : formatDateTime(value, locale);
  // Valeur vide ou illisible : ce n'est pas une date, pas d'icône.
  if (parsed === null) return text;
  return <DateStamp date={parsed}>{text}</DateStamp>;
}
