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

/** Types d'objets du collector qui ont une identité visuelle propre. */
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
 * Pictogramme et teinte d'un type d'objet. Même vocabulaire dans le menu, dans les
 * en-têtes de panneaux et partout où il faudra dire de quoi on parle : c'est ce qui
 * relie une ligne de table à l'entrée de menu dont elle vient.
 *
 * Les classes sont écrites en toutes lettres : Tailwind ne voit pas les noms
 * construits à l'exécution.
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
  // Même teinte que les groupes : le collector historique peint `guy16` et `guys16`
  // du même saumon, les deux parlent de personnes.
  user: { Icon: UserIcon, className: "text-icon-group" },
  // Bleu bleuet dans le collector historique : la teinte des nodes, qu'elle concerne.
  obsolescence: { Icon: LifeRingIcon, className: "text-icon-node" },
  // `log16` n'a pas de couleur propre dans le collector historique : teinte neutre.
  log: { Icon: HistoryIcon, className: "text-icon-dashboard" },
  // `filter16` n'a pas non plus de couleur propre : teinte neutre.
  filter: { Icon: FilterIcon, className: "text-icon-dashboard" },
  // Même icône que le filtre : le collector historique les marque tous deux `filter16`.
  filterset: { Icon: FilterIcon, className: "text-icon-dashboard" },
};

export function ObjectIcon({ kind, className }: { kind: ObjectKind; className?: string }) {
  const { Icon, className: hue } = KINDS[kind];
  return <Icon className={`shrink-0 ${hue} ${className ?? ""}`} />;
}
