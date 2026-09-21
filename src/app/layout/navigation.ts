/**
 * Menu structure, as data rather than JSX: adding a view or a section is done here,
 * and folding by section will be able to rely on the category key without touching
 * the rendering.
 *
 * The sections mirror those of the historical collector menu, listed in MIGRATION.md
 * §4.4. Only sections with at least one ported view are declared: an empty section
 * would promise views that do not exist yet.
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
  /** True for the root: without it, prefix matching would activate it everywhere. */
  exact?: boolean;
}

export interface NavCategory {
  key: string;
  labelKey: string;
  entries: NavEntry[];
}

/** Entries outside any category, at the top of the menu. */
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
    // Application codes go here rather than under Infrastructure: the historical menu
    // kept their creation in `dm-add-app`, and the view carries the list and the
    // creation together.
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
      // Groups follow the users they gather. The historical menu kept them under Data
      // Management (`dm-add-group`); moved here on request.
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
