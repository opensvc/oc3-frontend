import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
  const chosen = toEnumValues(value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node) || root.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
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
        if (!(event.relatedTarget instanceof Node) || !root.current?.contains(event.relatedTarget))
          setOpen(false);
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
      {open && (
        <fieldset
          id={listId}
          // Focusable, so that a click on a label keeps the focus inside: otherwise
          // the button loses it to nothing and the list closes under the pointer.
          tabIndex={-1}
          className="absolute left-0 z-20 mt-1 min-w-40 rounded-(--radius-panel) border border-line bg-surface-raised p-1 shadow-lg outline-none"
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
        </fieldset>
      )}
    </div>
  );
}
