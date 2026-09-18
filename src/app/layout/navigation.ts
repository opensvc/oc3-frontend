/**
 * Structure du menu, en données plutôt qu'en JSX : ajouter une vue ou une section
 * se fait ici, et le repli par section pourra s'appuyer sur la clé de catégorie
 * sans toucher au rendu.
 *
 * Les sections reprennent celles du menu du collector historique, recensées dans
 * MIGRATION.md §4.4. Seules les sections ayant au moins une vue portée sont
 * déclarées : une section vide promettrait des vues qui n'existent pas encore.
 */
import type { ObjectKind } from "@/components/opensvc/ObjectIcon";

export interface NavEntry {
  to:
    | "/"
    | "/nodes"
    | "/services"
    | "/instances"
    | "/networks"
    | "/disks"
    | "/apps"
    | "/groups"
    | "/tags"
    | "/users"
    | "/obsolescence"
    | "/logs"
    | "/filters"
    | "/filtersets";
  labelKey: string;
  icon: ObjectKind;
  /** Vrai pour la racine : sans cela la correspondance par préfixe l'activerait partout. */
  exact?: boolean;
}

export interface NavCategory {
  key: string;
  labelKey: string;
  entries: NavEntry[];
}

/** Entrées hors catégorie, en tête du menu. */
export const NAV_TOP: NavEntry[] = [
  { to: "/", labelKey: "nav.dashboard", icon: "dashboard", exact: true },
];

export const NAV_CATEGORIES: NavCategory[] = [
  {
    key: "infrastructure",
    labelKey: "nav.categories.infrastructure",
    entries: [
      { to: "/nodes", labelKey: "nav.nodes", icon: "node" },
      { to: "/services", labelKey: "nav.services", icon: "service" },
      { to: "/instances", labelKey: "nav.instances", icon: "instance" },
      { to: "/networks", labelKey: "nav.networks", icon: "network" },
      { to: "/disks", labelKey: "nav.disks", icon: "disk" },
    ],
  },
  {
    // Les codes application vont ici, et non sous Infrastructure : le menu
    // historique rangeait leur création dans `dm-add-app`, et la vue porte
    // justement la liste et la création ensemble.
    key: "dataManagement",
    labelKey: "nav.categories.dataManagement",
    entries: [
      { to: "/apps", labelKey: "nav.apps", icon: "app" },
      { to: "/tags", labelKey: "nav.tags", icon: "app" },
    ],
  },
  {
    // Le menu historique place les utilisateurs sous Administration (`adm-usr`).
    key: "administration",
    labelKey: "nav.categories.administration",
    entries: [
      { to: "/users", labelKey: "nav.users", icon: "user" },
      // Les groupes suivent les utilisateurs qu'ils rassemblent. Le menu historique les
      // rangeait sous Data Management (`dm-add-group`) ; déplacés ici à la demande.
      { to: "/groups", labelKey: "nav.groups", icon: "group" },
      // `adm-obs` dans le menu historique.
      { to: "/obsolescence", labelKey: "nav.obsolescence", icon: "obsolescence" },
      // `adm-log`.
      { to: "/logs", labelKey: "nav.logs", icon: "log" },
      // `adm-filters`.
      { to: "/filters", labelKey: "nav.filters", icon: "filter" },
      // `adm-filtersets`.
      { to: "/filtersets", labelKey: "nav.filtersets", icon: "filterset" },
    ],
  },
];
