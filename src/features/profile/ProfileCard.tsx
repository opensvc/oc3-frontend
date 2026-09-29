import { useId, type ReactNode } from "react";
import { ColumnFamilyIcon, type ColumnFamily } from "@/components/opensvc/ColumnFamily";

/**
 * A card of the profile page: a titled block of related settings, with a line
 * saying what they do. Without a title, the content brings its own headings.
 */
export function ProfileCard({
  title,
  family,
  hint,
  children,
  className = "",
}: {
  title?: string;
  family?: ColumnFamily;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={title === undefined ? undefined : id}
      className={`rounded-(--radius-panel) border border-line bg-surface-raised p-4 ${className}`}
    >
      {title !== undefined && (
        <h2 id={id} className="mb-1 flex items-center gap-2 font-semibold">
          {family !== undefined && <ColumnFamilyIcon family={family} />}
          {title}
        </h2>
      )}
      {hint !== undefined && <p className="mb-3 text-ink-muted">{hint}</p>}
      {children}
    </section>
  );
}
