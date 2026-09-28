import {
  AsteriskIcon,
  BellIcon,
  ClockIcon,
  CloudIcon,
  ClusterIcon,
  CpuIcon,
  CubeIcon,
  DrpIcon,
  DatabaseIcon,
  EnvIcon,
  FirewallIcon,
  GearIcon,
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
 * Family of a column: the subject it speaks of, not the type of its value.
 *
 * This is the convention of the historical collector, whose column pickers mark each
 * entry with a family icon (classes `node16`, `loc`, `cpu16`, `mem16`, `os16`,
 * `time16`, `pwr`… in `init/static/css/base.css`).
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
  | "drp"
  | "package"
  | "moduleset";

/**
 * The collector colours by domain rather than by family: everything about the node is
 * cornflower, network and security zone are cadet, service is green, teams are
 * salmon, application is magenta, timestamps are neutral. We take that split over,
 * with the tints already defined in the tokens.
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
  // The collector's `drp16` has no colour of its own: neutral as well.
  drp: { Icon: DrpIcon, className: "text-ink-muted" },
  // The historical packages table marks its columns with `pkg16`, the tan cube.
  package: { Icon: CubeIcon, className: "text-icon-package" },
  // The historical moduleset columns carry a cog (`action16`): the cogs of the
  // Modulesets menu entry, in the compliance tint.
  moduleset: { Icon: GearIcon, className: "text-icon-compliance" },
};

export function ColumnFamilyIcon({ family }: { family: ColumnFamily }) {
  const { Icon, className } = FAMILIES[family];
  return <Icon className={`shrink-0 ${className}`} />;
}
