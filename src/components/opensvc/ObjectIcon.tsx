import {
  AlertTriangleIcon,
  AsteriskIcon,
  DatabaseIcon,
  FilterIcon,
  HistoryIcon,
  InstanceIcon,
  LifeRingIcon,
  NetworkIcon,
  ServerIcon,
  StackIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";

/** Collector object kinds that have a visual identity of their own. */
export type ObjectKind =
  | "dashboard"
  | "node"
  | "service"
  | "instance"
  | "network"
  | "disk"
  | "app"
  | "group"
  | "user"
  | "obsolescence"
  | "log"
  | "filter"
  | "filterset";

/**
 * Pictogram and tint of an object kind. The same vocabulary in the menu, in panel
 * headers and everywhere it will be necessary to say what is being talked about:
 * this is what ties a table row to the menu entry it comes from.
 *
 * The classes are written out in full: Tailwind does not see names built at runtime.
 */
const KINDS: Record<ObjectKind, { Icon: typeof ServerIcon; className: string }> = {
  dashboard: { Icon: AlertTriangleIcon, className: "text-icon-dashboard" },
  node: { Icon: ServerIcon, className: "text-icon-node" },
  service: { Icon: StackIcon, className: "text-icon-service" },
  // Teinte du service : une instance est un service vu depuis un node.
  instance: { Icon: InstanceIcon, className: "text-icon-service" },
  network: { Icon: NetworkIcon, className: "text-icon-network" },
  disk: { Icon: DatabaseIcon, className: "text-icon-disk" },
  app: { Icon: AsteriskIcon, className: "text-icon-app" },
  group: { Icon: UsersIcon, className: "text-icon-group" },
  // Same tint as groups: the historical collector paints `guy16` and `guys16` in the
  // same salmon, both speak of people.
  user: { Icon: UserIcon, className: "text-icon-group" },
  // Bleu bleuet dans le collector historique : la teinte des nodes, qu'elle concerne.
  obsolescence: { Icon: LifeRingIcon, className: "text-icon-node" },
  // `log16` n'a pas de couleur propre dans le collector historique : teinte neutre.
  log: { Icon: HistoryIcon, className: "text-icon-dashboard" },
  // `filter16` n'a pas non plus de couleur propre : teinte neutre.
  filter: { Icon: FilterIcon, className: "text-icon-dashboard" },
  // Same icon as the filter: the historical collector marks both of them `filter16`.
  filterset: { Icon: FilterIcon, className: "text-icon-dashboard" },
};

export function ObjectIcon({ kind, className }: { kind: ObjectKind; className?: string }) {
  const { Icon, className: hue } = KINDS[kind];
  return <Icon className={`shrink-0 ${hue} ${className ?? ""}`} />;
}
