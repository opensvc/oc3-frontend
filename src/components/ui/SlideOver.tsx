import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/**
 * Panneau latéral qui entre par la droite.
 *
 * Non modal : la table reste lisible et utilisable pendant qu'il est ouvert.
 * Il reste monté en permanence pour que l'entrée et la sortie soient animées ;
 * fermé, `inert` le retire du parcours clavier et des technologies d'assistance.
 * L'animation est neutralisée par la règle globale prefers-reduced-motion.
 */
export function SlideOver({
  open,
  title,
  onClose,
  closeLabel,
  leading,
  subheader,
  wide = false,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  closeLabel: string;
  /** Visuel placé avant le titre, par exemple l'icône du type d'objet. */
  leading?: ReactNode;
  /** Bande fixée sous le titre, hors défilement : des onglets, par exemple. */
  subheader?: ReactNode;
  /** Tiroir plus large, pour un contenu fait de listes plutôt que de propriétés. */
  wide?: boolean;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      // Mémorise l'élément déclencheur pour lui rendre le focus à la fermeture.
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

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={title}
      aria-modal="false"
      tabIndex={-1}
      inert={!open}
      className={`fixed inset-y-0 right-0 z-10 flex w-full ${wide ? "max-w-3xl" : "max-w-xl"} flex-col border-l border-line bg-surface-raised shadow-lg transition-transform duration-200 ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        {leading}
        <h2 className="truncate text-title font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          title={closeLabel}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-(--radius-control) border border-line text-ink-muted hover:text-ink"
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
