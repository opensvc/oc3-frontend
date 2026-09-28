import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  AsteriskIcon,
  BellIcon,
  CalendarIcon,
  CaretRightIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  CloudIcon,
  ClusterIcon,
  CpuIcon,
  CubeIcon,
  DatabaseIcon,
  DrpIcon,
  EnvIcon,
  FileIcon,
  FilterIcon,
  FolderIcon,
  GearIcon,
  GlobeIcon,
  HistoryIcon,
  InstanceIcon,
  KeyIcon,
  LinkIcon,
  LocationIcon,
  LockIcon,
  MailIcon,
  MemoryIcon,
  NetworkIcon,
  OsIcon,
  PencilIcon,
  PowerIcon,
  PuzzleIcon,
  RefreshIcon,
  RssIcon,
  ServerIcon,
  SnowflakeIcon,
  SortIcon,
  StackIcon,
  StepBackwardIcon,
  StepForwardIcon,
  TargetIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";

export type Glyph = typeof ServerIcon;

/**
 * The icon classes of the historical collector (`init/static/css/base.css`) that
 * form definitions name in their Css, LabelCss and FolderCss attributes, with the
 * glyph and the tint they stand for here. The collector colours by domain: the
 * tints are those of the tokens for the same domains (node, service, network,
 * disk, team, application, form), and neutral where the collector has none.
 */
const ICONS: Record<string, { Icon: Glyph; tone: string }> = {
  node16: { Icon: ServerIcon, tone: "text-icon-node" },
  cluster: { Icon: ClusterIcon, tone: "text-icon-node" },
  cpu16: { Icon: CpuIcon, tone: "text-icon-node" },
  hw16: { Icon: CpuIcon, tone: "text-icon-node" },
  mem16: { Icon: MemoryIcon, tone: "text-icon-node" },
  os16: { Icon: OsIcon, tone: "text-icon-node" },
  hv16: { Icon: CloudIcon, tone: "text-icon-node" },
  loc: { Icon: LocationIcon, tone: "text-icon-node" },
  "fa-map-marker": { Icon: LocationIcon, tone: "text-icon-node" },
  node_env16: { Icon: EnvIcon, tone: "text-icon-node" },
  pwr: { Icon: PowerIcon, tone: "text-icon-node" },
  svc: { Icon: StackIcon, tone: "text-icon-service" },
  svcinstance: { Icon: InstanceIcon, tone: "text-icon-service" },
  svc_env16: { Icon: EnvIcon, tone: "text-icon-service" },
  action16: { Icon: GearIcon, tone: "text-icon-service" },
  action48: { Icon: GearIcon, tone: "text-icon-service" },
  "fa-cog": { Icon: GearIcon, tone: "text-ink-muted" },
  net16: { Icon: NetworkIcon, tone: "text-icon-network" },
  ip16: { Icon: NetworkIcon, tone: "text-icon-network" },
  segment16: { Icon: NetworkIcon, tone: "text-icon-network" },
  dns16: { Icon: GlobeIcon, tone: "text-icon-network" },
  dns48: { Icon: GlobeIcon, tone: "text-icon-network" },
  hd16: { Icon: DatabaseIcon, tone: "text-icon-disk" },
  disk48: { Icon: DatabaseIcon, tone: "text-icon-disk" },
  diskgroup: { Icon: DatabaseIcon, tone: "text-icon-disk" },
  db16: { Icon: DatabaseIcon, tone: "text-ink-muted" },
  guy16: { Icon: UserIcon, tone: "text-icon-group" },
  guy48: { Icon: UserIcon, tone: "text-icon-group" },
  guys16: { Icon: UsersIcon, tone: "text-icon-group" },
  pkg16: { Icon: CubeIcon, tone: "text-icon-group" },
  app16: { Icon: AsteriskIcon, tone: "text-icon-app" },
  comp16: { Icon: TargetIcon, tone: "text-icon-form" },
  comp48: { Icon: TargetIcon, tone: "text-icon-form" },
  compstatus: { Icon: CheckIcon, tone: "text-icon-form" },
  complog: { Icon: HistoryIcon, tone: "text-icon-form" },
  wf16: { Icon: PuzzleIcon, tone: "text-icon-form" },
  wf48: { Icon: PuzzleIcon, tone: "text-icon-form" },
  designer16: { Icon: PuzzleIcon, tone: "text-icon-form" },
  "fa-puzzle-piece": { Icon: PuzzleIcon, tone: "text-icon-form" },
  check16: { Icon: CheckIcon, tone: "text-state-up" },
  ok: { Icon: CheckIcon, tone: "text-state-up" },
  nok: { Icon: CloseIcon, tone: "text-state-down" },
  "fa-exclamation-triangle": { Icon: AlertTriangleIcon, tone: "text-state-warn" },
  frozen16: { Icon: SnowflakeIcon, tone: "text-ink-muted" },
  time16: { Icon: ClockIcon, tone: "text-ink-muted" },
  "fa-clock": { Icon: ClockIcon, tone: "text-ink-muted" },
  "fa-calendar": { Icon: CalendarIcon, tone: "text-ink-muted" },
  "fa-bell": { Icon: BellIcon, tone: "text-ink-muted" },
  filter16: { Icon: FilterIcon, tone: "text-ink-muted" },
  filters: { Icon: FilterIcon, tone: "text-ink-muted" },
  key: { Icon: KeyIcon, tone: "text-ink-muted" },
  "fa-key": { Icon: KeyIcon, tone: "text-ink-muted" },
  safe16: { Icon: LockIcon, tone: "text-icon-form" },
  "fa-lock": { Icon: LockIcon, tone: "text-ink-muted" },
  file16: { Icon: FileIcon, tone: "text-ink-muted" },
  "fa-file": { Icon: FileIcon, tone: "text-ink-muted" },
  edit16: { Icon: PencilIcon, tone: "text-ink-muted" },
  edit: { Icon: PencilIcon, tone: "text-ink-muted" },
  "fa-edit": { Icon: PencilIcon, tone: "text-ink-muted" },
  "fa-pencil": { Icon: PencilIcon, tone: "text-ink-muted" },
  link16: { Icon: LinkIcon, tone: "text-ink-muted" },
  "fa-link": { Icon: LinkIcon, tone: "text-ink-muted" },
  "fa-mail": { Icon: MailIcon, tone: "text-ink-muted" },
  "fa-envelope": { Icon: MailIcon, tone: "text-ink-muted" },
  "fa-rss": { Icon: RssIcon, tone: "text-ink-muted" },
  "fa-sort": { Icon: SortIcon, tone: "text-ink-muted" },
  "fa-step-forward": { Icon: StepForwardIcon, tone: "text-ink-muted" },
  "fa-step-backward": { Icon: StepBackwardIcon, tone: "text-ink-muted" },
  right16: { Icon: CaretRightIcon, tone: "text-ink-muted" },
  "fa-caret-right": { Icon: CaretRightIcon, tone: "text-ink-muted" },
  "fa-chevron-circle-right": { Icon: CaretRightIcon, tone: "text-ink-muted" },
  parentfolder: { Icon: ArrowLeftIcon, tone: "text-ink-muted" },
  "fa-arrow-left": { Icon: ArrowLeftIcon, tone: "text-ink-muted" },
  "fa-folder": { Icon: FolderIcon, tone: "text-ink-muted" },
  "fa-folder-open": { Icon: FolderIcon, tone: "text-ink-muted" },
  "folder-closed": { Icon: FolderIcon, tone: "text-ink-muted" },
  log16: { Icon: HistoryIcon, tone: "text-ink-muted" },
  refresh16: { Icon: RefreshIcon, tone: "text-ink-muted" },
  drp16: { Icon: DrpIcon, tone: "text-ink-muted" },
};

/**
 * What a legacy class list says, once translated: an icon, and whether the text
 * is preformatted (`pre`: monospace, line breaks kept). The Font Awesome base and
 * size classes (`fa`, `icon`, `fa-2x`, the 48 pixel variants…) carry nothing
 * here, each place having its own icon size; an unknown class is ignored, as a
 * browser ignores a class no stylesheet defines.
 */
export interface LegacyCss {
  icon: { Icon: Glyph; tone: string } | null;
  pre: boolean;
}

export function parseLegacyCss(css: string | undefined): LegacyCss {
  const classes = (css ?? "").split(/\s+/).filter((c) => c !== "");
  const known = classes.map((c) => ICONS[c]).find((icon) => icon !== undefined);
  return { icon: known ?? null, pre: classes.includes("pre") };
}
