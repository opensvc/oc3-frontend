import { createElement, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  BanIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  CpuIcon,
  CubeIcon,
  DatabaseIcon,
  DownloadIcon,
  DrpIcon,
  DropIcon,
  EyeOffIcon,
  FileIcon,
  GearIcon,
  InfoIcon,
  LifeRingIcon,
  LineChartIcon,
  LinkIcon,
  ListChecksIcon,
  LocationIcon,
  NetworkIcon,
  PlayIcon,
  PowerIcon,
  PowerOffIcon,
  PuzzleIcon,
  RefreshIcon,
  ResetIcon,
  SearchIcon,
  ShapesIcon,
  SlidersIcon,
  SnowflakeIcon,
  StepForwardIcon,
  StopIcon,
  SunIcon,
  SwapIcon,
  TagIcon,
  TargetIcon,
  ToggleOffIcon,
  ToggleOnIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/ui/icons";

/** What an action costs: services stopped for a while, data lost. */
export type ActionImpact = "downTime" | "dataLoss";

/** How an action shows in its menu: its icon, red when it harms, what it costs. */
export interface ActionLook {
  icon: ReactNode;
  danger?: boolean;
  impacts?: readonly ActionImpact[];
}

const ICON = "h-4 w-4 shrink-0 text-ink-muted";
const DANGER_ICON = "h-4 w-4 shrink-0 text-state-down";

/** An icon of a menu entry, red for a harmful one. */
function icon(Icon: ComponentType<{ className?: string }>, danger = false): ReactNode {
  return createElement(Icon, { className: danger ? DANGER_ICON : ICON });
}

/**
 * The looks of the agent actions, by the action queued, whatever the object: the
 * same action shows the same everywhere, freeze its snowflake on a node as on a
 * service. Their icons are those of the om3 webapp for the same actions. Red, the
 * actions that stop what runs on a whole node; badged with the down-time they
 * cause, those that stop or move services.
 */
const ACTIONS: Readonly<Record<string, ActionLook>> = {
  // What refreshes the collector's data.
  pushasset: { icon: icon(CpuIcon) },
  checks: { icon: icon(ListChecksIcon) },
  sysreport: { icon: icon(FileIcon) },
  pushdisks: { icon: icon(DatabaseIcon) },
  pushpkg: { icon: icon(CubeIcon) },
  pushpatch: { icon: icon(ShapesIcon) },
  pushstats: { icon: icon(LineChartIcon) },
  "push config": { icon: icon(UploadIcon) },
  "push resinfo": { icon: icon(InfoIcon) },
  // Compliance.
  compliance_check: { icon: icon(TargetIcon) },
  compliance_fix: { icon: icon(LifeRingIcon) },
  updatecomp: { icon: icon(DownloadIcon) },
  // Orchestration.
  freeze: { icon: icon(SnowflakeIcon) },
  thaw: { icon: icon(SunIcon) },
  clear: { icon: icon(CheckIcon) },
  abort: { icon: icon(CloseIcon) },
  drain: { icon: icon(DropIcon, true), danger: true, impacts: ["downTime"] },
  // Replication.
  syncall: { icon: icon(RefreshIcon) },
  syncnodes: { icon: icon(NetworkIcon) },
  syncdrp: { icon: icon(DrpIcon) },
  // Maintenance.
  enable: { icon: icon(ToggleOnIcon) },
  disable: { icon: icon(ToggleOffIcon) },
  updatepkg: { icon: icon(UploadIcon) },
  scanscsi: { icon: icon(SearchIcon) },
  // Placement.
  switch: { icon: icon(SwapIcon), impacts: ["downTime"] },
  takeover: { icon: icon(StepForwardIcon), impacts: ["downTime"] },
  giveback: { icon: icon(ArrowLeftIcon), impacts: ["downTime"] },
  // Start and stop.
  start: { icon: icon(PlayIcon) },
  restart: { icon: icon(RefreshIcon), impacts: ["downTime"] },
  stop: { icon: icon(StopIcon), impacts: ["downTime"] },
  // Wake, reboot and shutdown of a node.
  wake: { icon: icon(PowerIcon) },
  schedule_reboot: { icon: icon(CalendarIcon) },
  unschedule_reboot: { icon: icon(CloseIcon) },
  reboot: { icon: icon(RefreshIcon, true), danger: true, impacts: ["downTime"] },
  shutdown: { icon: icon(PowerOffIcon, true), danger: true, impacts: ["downTime"] },
  // The queued actions themselves.
  cancel: { icon: icon(BanIcon) },
  redo: { icon: icon(RefreshIcon) },
};

/** The icons of the submenus, by group; `data` that of the data actions. */
const GROUPS: Readonly<Record<string, ReactNode>> = {
  refresh: icon(RefreshIcon),
  compliance: icon(TargetIcon),
  orchestration: icon(SnowflakeIcon),
  sync: icon(SwapIcon),
  maintenance: icon(GearIcon),
  placement: icon(LocationIcon),
  startStop: icon(PlayIcon),
  power: icon(PowerIcon),
  data: icon(DatabaseIcon),
};

/**
 * The looks of the data actions, by key, whatever the list: a deletion, red, its
 * bin everywhere.
 */
const DATA: Readonly<Record<string, ActionLook>> = {
  delete: { icon: icon(TrashIcon, true), danger: true },
  notificationsOn: { icon: icon(BellIcon) },
  notificationsOff: { icon: icon(EyeOffIcon) },
  tagAttach: { icon: icon(TagIcon) },
  modulesetAttach: { icon: icon(PuzzleIcon) },
  modulesetDetach: { icon: icon(PuzzleIcon) },
  rulesetAttach: { icon: icon(SlidersIcon) },
  rulesetDetach: { icon: icon(SlidersIcon) },
  acknowledge: { icon: icon(CheckIcon) },
  setThresholds: { icon: icon(SlidersIcon) },
  resetThresholds: { icon: icon(ResetIcon) },
  attach: { icon: icon(LinkIcon) },
  detach: { icon: icon(CloseIcon) },
};

/** The look of an agent action; none for an action it does not know. */
export function actionLook(action: string): ActionLook | undefined {
  return ACTIONS[action];
}

/** The icon of a submenu of actions. */
export function groupIcon(group: string): ReactNode {
  return GROUPS[group];
}

/** The look of a data action. */
export function dataActionLook(key: string): ActionLook | undefined {
  return DATA[key];
}

/** The icon of a menu entry that is neither an agent nor a data action, such as the comparison. */
export const MENU_ICON = ICON;
