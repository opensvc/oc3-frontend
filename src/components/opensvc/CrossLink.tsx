import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "./ObjectIcon";
import { usePeek } from "./use-peek";

/** Objects whose record `PeekPanel` knows how to show. */
export type CrossKind = "node" | "service" | "instance" | "app" | "group" | "tag";

/**
 * Value of a cell that names an object from another view: the node of an instance,
 * the service of a disk…
 *
 * A double-click shows its record in place of the row panel, without leaving the
 * list (`peek` in the URL, see `PeekPanel`): this is the gesture by which the old
 * collector opened the record of an object. A single click does nothing here, it
 * belongs to the row, whose own panel it opens.
 *
 * From the keyboard, the badge is a button like any other: Enter or Space shows the
 * record, and the tooltip says what the double-click does.
 */
export function CrossLink({
  kind,
  id,
  children,
}: {
  kind: CrossKind;
  /** Id the target view expects; without it, the value stays plain text. */
  id: string | undefined;
  children: ReactNode;
}) {
  const openRecord = usePeek();
  const { t } = useTranslation();

  if (
    id === undefined ||
    id === "" ||
    children === undefined ||
    children === null ||
    children === ""
  )
    return <>{children}</>;

  /** Shows the record without leaving the view, in place of the row panel. */
  const peek = () => {
    openRecord(kind, id);
  };

  return (
    <button
      type="button"
      title={t("crossLink.hint", { kind: t(`crossLink.kinds.${kind}`) })}
      onClick={(event) => {
        // The single click belongs to the row; without this, opening the badge would
        // also open the panel of the row under the pointer.
        event.stopPropagation();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        peek();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        peek();
      }}
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface px-1.5 text-data hover:border-line-strong hover:bg-surface-sunken"
    >
      <ObjectIcon kind={kind} className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  );
}
