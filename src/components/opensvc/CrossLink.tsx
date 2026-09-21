import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "./ObjectIcon";

/** Objets dont `PeekPanel` sait montrer la fiche. */
export type CrossKind = "node" | "service" | "instance" | "app" | "group";

/**
 * Valeur d'une cellule qui désigne un objet d'une autre vue : le node d'une
 * instance, le service d'un disque…
 *
 * Un double-clic montre sa fiche à la place du panneau de la ligne, sans quitter la
 * liste (`peek` dans l'URL, voir `PeekPanel`) : c'est le geste par lequel l'ancien
 * collector ouvrait la fiche d'un objet. Un simple clic ne fait rien ici, il est
 * réservé à la ligne, dont il ouvre le propre panneau.
 *
 * Au clavier, la puce est un bouton comme un autre : Entrée ou Espace montre la
 * fiche, et l'infobulle dit ce que fait le double-clic.
 */
export function CrossLink({
  kind,
  id,
  children,
}: {
  kind: CrossKind;
  /** Identifiant attendu par la vue cible ; sans lui, la valeur reste du texte. */
  id: string | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (
    id === undefined ||
    id === "" ||
    children === undefined ||
    children === null ||
    children === ""
  )
    return <>{children}</>;

  /** Montre la fiche sans quitter la vue, à la place du panneau de la ligne. */
  const peek = () => {
    void navigate({
      to: ".",
      search: (previous) => ({
        ...(previous as Record<string, unknown>),
        sel: undefined,
        tab: undefined,
        peek: `${kind}:${id}`,
        peektab: undefined,
      }),
      resetScroll: false,
    });
  };

  return (
    <button
      type="button"
      title={t("crossLink.hint", { kind: t(`crossLink.kinds.${kind}`) })}
      onClick={(event) => {
        // Le clic simple reste à la ligne ; sans quoi ouvrir la puce ouvrirait aussi
        // le panneau de la ligne survolée.
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
