import {
  AsteriskIcon,
  BellIcon,
  ClockIcon,
  CloudIcon,
  ClusterIcon,
  CpuIcon,
  DrpIcon,
  DatabaseIcon,
  EnvIcon,
  FirewallIcon,
  LocationIcon,
  MemoryIcon,
  NetworkIcon,
  OsIcon,
  PowerIcon,
  ServerIcon,
  StateIcon,
  StackIcon,
  UsersIcon,
} from "@/components/ui/icons";

/**
 * Famille d'une colonne : le sujet dont elle parle, pas le type de sa valeur.
 *
 * C'est la convention du collector historique, dont les sélecteurs de colonnes
 * marquent chaque entrée d'une icône de famille (classes `node16`, `loc`, `cpu16`,
 * `mem16`, `os16`, `time16`, `pwr`… dans `init/static/css/base.css`).
 */
export type ColumnFamily =
  | "node"
  | "cluster"
  | "env"
  | "security"
  | "location"
  | "hypervisor"
  | "os"
  | "cpu"
  | "memory"
  | "network"
  | "time"
  | "service"
  | "power"
  | "team"
  | "app"
  | "disk"
  | "alert"
  | "state"
  | "drp";

/**
 * Le collector colore par domaine et non par famille : tout ce qui touche au node est
 * bleuet, le réseau et la zone de sécurité cadet, le service vert, les équipes
 * saumon, l'application magenta, l'horodatage neutre. On reprend ce découpage avec
 * les teintes déjà définies dans les tokens.
 */
const FAMILIES: Record<ColumnFamily, { Icon: typeof ServerIcon; className: string }> = {
  node: { Icon: ServerIcon, className: "text-icon-node" },
  cluster: { Icon: ClusterIcon, className: "text-icon-node" },
  env: { Icon: EnvIcon, className: "text-icon-node" },
  location: { Icon: LocationIcon, className: "text-icon-node" },
  hypervisor: { Icon: CloudIcon, className: "text-icon-node" },
  os: { Icon: OsIcon, className: "text-icon-node" },
  cpu: { Icon: CpuIcon, className: "text-icon-node" },
  memory: { Icon: MemoryIcon, className: "text-icon-node" },
  power: { Icon: PowerIcon, className: "text-icon-node" },
  security: { Icon: FirewallIcon, className: "text-icon-network" },
  network: { Icon: NetworkIcon, className: "text-icon-network" },
  service: { Icon: StackIcon, className: "text-icon-service" },
  team: { Icon: UsersIcon, className: "text-icon-group" },
  app: { Icon: AsteriskIcon, className: "text-icon-app" },
  disk: { Icon: DatabaseIcon, className: "text-icon-disk" },
  time: { Icon: ClockIcon, className: "text-ink-muted" },
  alert: { Icon: BellIcon, className: "text-ink-muted" },
  state: { Icon: StateIcon, className: "text-ink-muted" },
  // `drp16` du collector n'a pas de couleur propre : neutre également.
  drp: { Icon: DrpIcon, className: "text-ink-muted" },
};

export function ColumnFamilyIcon({ family }: { family: ColumnFamily }) {
  const { Icon, className } = FAMILIES[family];
  return <Icon className={`shrink-0 ${className}`} />;
}
