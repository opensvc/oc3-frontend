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
/**
 * Ce qui répond au clic et n'a donc pas à refermer le panneau : les commandes et les
 * champs, ce qui porte un rôle ou un raccourci clavier, et les tables, dont les
 * lignes ouvrent leur propre panneau.
 */
const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, details, table, [role="dialog"], [role="button"], [role="menu"], [role="menuitem"], [role="tab"], [role="listbox"], [role="option"], [role="combobox"], [tabindex]';

export function SlideOver({
  open,
  title,
  onClose,
  closeLabel,
  leading,
  subheader,
  wide = false,
  closeOnOutsideClick = true,
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
  /**
   * Faux pour un tiroir de saisie : un clic à côté y effacerait un formulaire en
   * cours, alors qu'il ne fait que reposer une fiche qu'on lisait.
   */
  closeOnOutsideClick?: boolean;
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

  // Cliquer à côté referme, comme on repose une fiche qu'on vient de lire. Seuls les
  // fonds inertes comptent : un clic sur une commande ou sur une ligne de liste fait
  // ce qu'il dit, et refermer par-dessus donnerait l'impression d'avoir raté sa cible.
  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (panel.current?.contains(target) === true) return;
      if (target.closest(INTERACTIVE) !== null) return;
      // Une saisie en cours dans le panneau — un attribut en cours de modification —
      // vaut formulaire : on ne l'efface pas d'un clic à côté.
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
