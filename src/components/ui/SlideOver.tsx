import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/**
 * Side panel sliding in from the right.
 *
 * Not modal: the table stays readable and usable while it is open. It stays mounted
 * at all times so that entering and leaving are animated; closed, `inert` takes it
 * out of the keyboard path and away from assistive technologies. The animation is
 * neutralised by the global prefers-reduced-motion rule.
 */
/**
 * What answers a click and therefore must not close the panel: controls and fields,
 * anything carrying a role or a keyboard shortcut, and tables, whose rows open their
 * own panel.
 */
const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, details, table, [role="dialog"], [role="button"], [role="menu"], [role="menuitem"], [role="tab"], [role="listbox"], [role="option"], [role="combobox"], [tabindex]';

/** Maximum widths, written out in full: Tailwind does not see names built at runtime. */
const SIZES = { default: "max-w-xl", wide: "max-w-3xl", wider: "max-w-4xl" } as const;

export function SlideOver({
  open,
  title,
  onClose,
  closeLabel,
  leading,
  subheader,
  size = "default",
  closeOnOutsideClick = true,
  actions,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  closeLabel: string;
  /** Visual placed before the title, for example the object kind icon. */
  leading?: ReactNode;
  /** Strip fixed under the title, outside the scroll: tabs, for instance. */
  subheader?: ReactNode;
  /**
   * Width of the drawer: "wide" for content made of lists rather than properties,
   * "wider" for a drawer whose tab bar lists many kinds of related data.
   */
  size?: "default" | "wide" | "wider";
  /**
   * False for a drawer editing an existing object at length, a form definition for
   * instance: a stray click beside it would drop the changes. Creation drawers close
   * on it like the others.
   */
  closeOnOutsideClick?: boolean;
  /** Buttons of the header, before the close button: the history button, say. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      // Remembers the triggering element to give it the focus back on closing.
      opener.current = document.activeElement;
      panel.current?.focus();
      return;
    }
    if (opener.current instanceof HTMLElement && document.contains(opener.current)) {
      opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  // Clicking beside it closes, as one puts down a record just read. Only inert
  // backgrounds count: a click on a control or on a list row does what it says, and
  // closing on top of that would feel like having missed the target.
  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (panel.current?.contains(target) === true) return;
      if (target.closest(INTERACTIVE) !== null) return;
      // An entry in progress in the panel — an attribute being edited — counts as a
      // form: it is not cleared by a click beside it.
      const focused = document.activeElement;
      if (
        focused instanceof HTMLElement &&
        panel.current?.contains(focused) === true &&
        focused.matches("input, select, textarea")
      )
        return;
      onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, closeOnOutsideClick]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={title}
      aria-modal="false"
      tabIndex={-1}
      inert={!open}
      className={`fixed inset-y-0 right-0 z-10 flex w-full ${SIZES[size]} flex-col border-l border-line bg-surface-raised shadow-lg transition-transform duration-200 ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        {leading}
        <h2 className="truncate text-title font-semibold">{title}</h2>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
        <button
          type="button"
          onClick={onClose}
          title={closeLabel}
          className="flex h-7 w-7 items-center justify-center rounded-(--radius-control) border border-line text-ink-muted hover:text-ink"
        >
          <CloseIcon />
          <span className="sr-only">{closeLabel}</span>
        </button>
      </div>
      {subheader}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}
