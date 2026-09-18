import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { ChevronDownIcon, SignOutIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/session";

const ITEM =
  "flex w-full items-center gap-2 rounded-(--radius-control) px-2 py-1.5 text-left text-ink hover:bg-surface focus:bg-surface focus:outline-none";

/**
 * Menu du compte, ouvert depuis le nom de l'utilisateur dans la barre du haut.
 *
 * Suit le motif « menu button » de l'ARIA APG : le bouton annonce le menu et son
 * état, l'ouverture au clavier place le focus sur la première entrée, les flèches,
 * Début et Fin parcourent les entrées, Échap referme et rend le focus au bouton.
 * Un clic hors du menu, Tab ou le choix d'une entrée le referment aussi.
 */
export function UserMenu({ user }: { user: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // Entrée à focaliser à l'ouverture : la première au clavier, aucune à la souris.
  const focusOnOpen = useRef<"first" | "last" | null>(null);

  function items(): HTMLElement[] {
    return [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
  }

  useEffect(() => {
    if (!open) return;
    const target = focusOnOpen.current;
    focusOnOpen.current = null;
    if (target !== null) {
      const list = items();
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
      // Menu déjà ouvert à la souris : le focus est resté sur le bouton.
      const list = items();
      (target === "first" ? list[0] : list[list.length - 1])?.focus();
      return;
    }
    focusOnOpen.current = target;
    setOpen(true);
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items();
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
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={t("header.accountMenu")}
        onClick={() => {
          setOpen((previous) => !previous);
        }}
        onKeyDown={onButtonKeyDown}
        className="flex items-center gap-1.5 rounded-(--radius-control) px-1 py-1 text-ink-muted hover:text-ink aria-expanded:text-ink"
      >
        <ObjectIcon kind="user" />
        {user}
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={t("header.accountMenu")}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-30 mt-1 min-w-48 rounded-(--radius-panel) border border-line bg-surface-raised p-1 shadow-lg"
        >
          <Link
            to="/profile"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close(false);
            }}
            className={ITEM}
          >
            <ObjectIcon kind="user" />
            {t("profile.title")}
          </Link>
          <div role="separator" className="my-1 border-t border-line" />
          <button type="button" role="menuitem" tabIndex={-1} onClick={signOut} className={ITEM}>
            <SignOutIcon className="text-ink-muted" />
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
