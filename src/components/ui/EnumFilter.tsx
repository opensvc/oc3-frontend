import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { fromEnumValues, toEnumValues } from "@/lib/column-filters";
import { ChevronDownIcon } from "./icons";

export interface EnumFilterOption {
  value: string;
  /** Plain label: for the summary on the button and for assistive technologies. */
  label: string;
  /** Rendering in the list, as the cells show the value; the label otherwise. */
  render?: ReactNode;
}

/**
 * Filter of a column holding a known set of values: a button summarising the choice,
 * opening a list of checkboxes. Each ticked value widens the filter (`in:a,b`);
 * nothing ticked clears it. Every change applies at once.
 *
 * The list closes on a click outside it, on Escape, which does not reach the side
 * panel listening at the document level, and when the focus leaves it.
 *
 * The list is rendered in `document.body` and placed in fixed position under the
 * button: the filter sits in the header of a table whose container scrolls, and
 * a list positioned inside it would be clipped by that container when the table
 * has few rows. It opens above the button when the space below is short, and
 * follows the button when the page or the table scrolls.
 */
export function EnumFilter({
  value,
  onChange,
  options,
  label,
  allLabel,
}: {
  value: string | undefined;
  onChange: (expr: string | undefined) => void;
  options: EnumFilterOption[];
  /** Accessible name of the button and of the list. */
  label: string;
  /** Summary when nothing is ticked. */
  allLabel: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLFieldSetElement>(null);
  const chosen = toEnumValues(value);

  /** Inside the filter: the button, or the list, which lives elsewhere in the DOM. */
  function inside(node: Node) {
    return root.current?.contains(node) === true || list.current?.contains(node) === true;
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node) || inside(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Placed before paint, then again on every scroll (of the page or of the table,
  // hence the capture) and resize: the style is written on the element, without a
  // render.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const anchor = button.current?.getBoundingClientRect();
      const element = list.current;
      if (anchor === undefined || element === null) return;
      const gap = 4;
      const below = window.innerHeight - anchor.bottom - gap;
      const above = anchor.top - gap;
      const height = element.scrollHeight;
      const upward = height > below && above > below;
      element.style.left = `${String(Math.max(gap, Math.min(anchor.left, window.innerWidth - element.offsetWidth - gap)))}px`;
      element.style.minWidth = `${String(anchor.width)}px`;
      element.style.maxHeight = `${String(Math.max(upward ? above : below, 80))}px`;
      if (upward) {
        element.style.top = "";
        element.style.bottom = `${String(window.innerHeight - anchor.top + gap)}px`;
      } else {
        element.style.bottom = "";
        element.style.top = `${String(anchor.bottom + gap)}px`;
      }
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const labels = options.filter((option) => chosen.includes(option.value)).map((o) => o.label);
  // Values the list does not know, from a hand-made link: shown as they are.
  const unknown = chosen.filter((item) => !options.some((option) => option.value === item));
  const summary = [...labels, ...unknown].join(", ");

  function toggle(item: string) {
    const next = chosen.includes(item)
      ? chosen.filter((other) => other !== item)
      : [...chosen, item];
    onChange(fromEnumValues(next));
  }

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
      onBlur={(event) => {
        // React carries the events of the list here although it lives in the body.
        if (!(event.relatedTarget instanceof Node) || !inside(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${summary === "" ? allLabel : summary}`}
        onClick={() => {
          setOpen((previous) => !previous);
        }}
        className={`flex h-6 w-full min-w-24 items-center justify-between gap-1 rounded-(--radius-control) border bg-surface px-1.5 font-normal ${
          summary === "" ? "border-line text-ink-muted" : "border-accent text-ink"
        }`}
      >
        <span className="truncate">{summary === "" ? allLabel : summary}</span>
        <ChevronDownIcon className="h-3 w-3 shrink-0" />
      </button>
      {open &&
        createPortal(
          <fieldset
            ref={list}
            id={listId}
            // Focusable, so that a click on a label keeps the focus inside: otherwise
            // the button loses it to nothing and the list closes under the pointer.
            tabIndex={-1}
            className="fixed z-30 min-w-40 overflow-y-auto rounded-(--radius-panel) border border-line bg-surface-raised p-1 text-data shadow-lg outline-none"
          >
            <legend className="sr-only">{label}</legend>
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-(--radius-control) px-2 py-1 font-normal text-ink hover:bg-surface"
              >
                <input
                  type="checkbox"
                  checked={chosen.includes(option.value)}
                  onChange={() => {
                    toggle(option.value);
                  }}
                />
                {option.render ?? option.label}
              </label>
            ))}
          </fieldset>,
          document.body,
        )}
    </div>
  );
}
