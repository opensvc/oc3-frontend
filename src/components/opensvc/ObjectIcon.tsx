import {
  AlertTriangleIcon,
  AsteriskIcon,
  CpuIcon,
  CubeIcon,
  DatabaseIcon,
  FilterIcon,
  GearIcon,
  HistoryIcon,
  InstanceIcon,
  LifeRingIcon,
  NetworkIcon,
  PuzzleIcon,
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
  | "tag"
  | "group"
  | "user"
  | "obsolescence"
  | "log"
  | "filter"
  | "filterset"
  | "form"
  | "package"
  | "hardware"
  | "moduleset"
  | "ruleset"
  | "complianceLog";

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
  // Service tint: an instance is a service seen from a node.
  instance: { Icon: InstanceIcon, className: "text-icon-service" },
  network: { Icon: NetworkIcon, className: "text-icon-network" },
  disk: { Icon: DatabaseIcon, className: "text-icon-disk" },
  app: { Icon: AsteriskIcon, className: "text-icon-app" },
  // Same mark as in the menu, where the Tags entry shares the application asterisk.
  tag: { Icon: AsteriskIcon, className: "text-icon-app" },
  group: { Icon: UsersIcon, className: "text-icon-group" },
  // Same tint as groups: the historical collector paints `guy16` and `guys16` in the
  // same salmon, both speak of people.
  user: { Icon: UserIcon, className: "text-icon-group" },
  // Cornflower blue in the historical collector: the tint of nodes, which it is about.
  obsolescence: { Icon: LifeRingIcon, className: "text-icon-node" },
  // `log16` has no colour of its own in the historical collector: neutral tint.
  log: { Icon: HistoryIcon, className: "text-icon-dashboard" },
  // `filter16` has no colour of its own either: neutral tint.
  filter: { Icon: FilterIcon, className: "text-icon-dashboard" },
  // Same icon as the filter: the historical collector marks both of them `filter16`.
  filterset: { Icon: FilterIcon, className: "text-icon-dashboard" },
  form: { Icon: PuzzleIcon, className: "text-icon-form" },
  package: { Icon: CubeIcon, className: "text-icon-package" },
  // Cornflower blue in the historical collector (`hw16`): the tint of nodes.
  hardware: { Icon: CpuIcon, className: "text-icon-node" },
  // The cogs of the historical collector (`modset16`), in its compliance crimson.
  moduleset: { Icon: GearIcon, className: "text-icon-compliance" },
  // The cube of the historical collector (`rset16`), in its compliance crimson.
  ruleset: { Icon: CubeIcon, className: "text-icon-compliance" },
  // The history clock of the historical compliance log (`complog`), in its crimson.
  complianceLog: { Icon: HistoryIcon, className: "text-icon-compliance" },
};

export function ObjectIcon({ kind, className }: { kind: ObjectKind; className?: string }) {
  const { Icon, className: hue } = KINDS[kind];
  return <Icon className={`shrink-0 ${hue} ${className ?? ""}`} />;
}
