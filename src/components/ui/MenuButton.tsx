import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDownIcon } from "./icons";

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Trait de séparation avant cette entrée, pour marquer un groupe. */
  separatorBefore?: boolean;
  onSelect: () => void;
}

const ITEM =
  "flex w-full items-center gap-2 rounded-(--radius-control) px-2 py-1.5 text-left text-ink hover:bg-surface focus:bg-surface focus:outline-none disabled:text-ink-muted/60 disabled:hover:bg-transparent";

/**
 * Bouton ouvrant un menu d'actions, selon le motif « menu button » de l'ARIA APG,
 * comme le menu du compte dont il reprend le comportement : le bouton annonce le
 * menu et son état, l'ouverture au clavier place le focus sur la première entrée,
 * les flèches, Début et Fin parcourent les entrées, Échap referme et rend le focus
 * au bouton. Un clic hors du menu, Tab ou le choix d'une entrée le referment aussi.
 */
export function MenuButton({
  label,
  items,
  disabled = false,
  className = "",
}: {
  label: string;
  items: MenuItem[];
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // Entrée à focaliser à l'ouverture : la première au clavier, aucune à la souris.
  const focusOnOpen = useRef<"first" | "last" | null>(null);

  function entries(): HTMLElement[] {
    return [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
  }

  useEffect(() => {
    if (!open) return;
    const target = focusOnOpen.current;
    focusOnOpen.current = null;
    if (target !== null) {
      const list = entries();
      (target === "first" ? list[0] : list[list.length - 1])?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node) || root.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const target =
      event.key === "ArrowDown" || event.key === "Enter" || event.key === " "
        ? "first"
        : event.key === "ArrowUp"
          ? "last"
          : null;
    if (target === null) return;
    event.preventDefault();
    if (open) {
      const list = entries();
      (target === "first" ? list[0] : list[list.length - 1])?.focus();
      return;
    }
    focusOnOpen.current = target;
    setOpen(true);
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = entries();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        move(index + 1);
        break;
      case "ArrowUp":
        move(index - 1);
        break;
      case "Home":
        move(0);
        break;
      case "End":
        move(list.length - 1);
        break;
      case "Escape":
        // Le panneau latéral écoute Échap au niveau du document : ne fermer que le menu.
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => {
          setOpen((previous) => !previous);
        }}
        onKeyDown={onButtonKeyDown}
        className="flex h-7 items-center gap-1.5 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:border-line-strong hover:text-ink disabled:opacity-60 aria-expanded:text-ink"
      >
        {label}
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute left-0 z-30 mt-1 min-w-56 rounded-(--radius-panel) border border-line bg-surface-raised p-1 shadow-lg"
        >
          {items.map((item) => (
            <div key={item.key}>
              {item.separatorBefore === true && (
                <div role="separator" className="my-1 border-t border-line" />
              )}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  close(true);
                  item.onSelect();
                }}
                className={ITEM}
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
