import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ObjectIcon, type ObjectKind } from "./ObjectIcon";

/** Vues ouvrables depuis une puce : celles dont le panneau se désigne par `sel`. */
export type CrossView = "/nodes" | "/services" | "/instances" | "/apps" | "/groups";

/**
 * Valeur d'une cellule qui désigne un objet d'une autre vue : le node d'une
 * instance, le service d'un disque… Un double-clic ouvre la vue correspondante sur
 * le panneau de cet objet, comme l'ancien collector ouvrait la fiche d'un objet au
 * double-clic. Un simple clic ne fait rien ici : il est réservé à la ligne, dont il
 * ouvre le propre panneau.
 *
 * Au clavier, la puce est un bouton comme un autre : Entrée ou Espace ouvre la vue,
 * et l'infobulle dit ce que fera le double-clic.
 */
export function CrossLink({
  kind,
  to,
  id,
  children,
}: {
  kind: ObjectKind;
  to: CrossView;
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

  const open = () => {
    void navigate({ to, search: { sel: id } });
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
        open();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        open();
      }}
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface px-1.5 text-data hover:border-line-strong hover:bg-surface-sunken"
    >
      <ObjectIcon kind={kind} className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  );
}
