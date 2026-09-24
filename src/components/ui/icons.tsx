import type { SVGProps } from "react";

/**
 * Menu icons, drawn here rather than imported from a library.
 *
 * The historical collector uses solid Font Awesome 5 glyphs; we stay in that register
 * — solid silhouettes on a 24 grid, no thin outline — without adding an npm
 * dependency nor shipping a whole font for seven pictograms. The paths are written by
 * hand: reusing those of Font Awesome would require its CC BY attribution.
 *
 * Every icon inherits `currentColor`, the colour being carried by the caller's class.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Dashboard: the collector's warning triangle (fa-exclamation-triangle). */
export function AlertTriangleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2c.6 0 1.1.3 1.4.8l8.2 14.2c.6 1-.1 2.3-1.3 2.3H3.7c-1.2 0-1.9-1.3-1.3-2.3l8.2-14.2c.3-.5.8-.8 1.4-.8Zm0 5a1 1 0 0 0-1 1.1l.4 4.6a.6.6 0 0 0 1.2 0l.4-4.6a1 1 0 0 0-1-1.1Zm0 8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z" />
    </Svg>
  );
}

/** Nodes: the rack server (fa-server). */
export function ServerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 4h17c.8 0 1.5.7 1.5 1.5v3c0 .8-.7 1.5-1.5 1.5h-17C2.7 10 2 9.3 2 8.5v-3C2 4.7 2.7 4 3.5 4Zm2 1.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.2 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM3.5 14h17c.8 0 1.5.7 1.5 1.5v3c0 .8-.7 1.5-1.5 1.5h-17C2.7 20 2 19.3 2 18.5v-3c0-.8.7-1.5 1.5-1.5Zm2 1.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.2 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z" />
    </Svg>
  );
}

/**
 * Services: a stack of objects. The historical collector uses a filled circle
 * (fa-circle), but that glyph already stands for the "up" state in StatusBadge:
 * reusing it in the menu would make the two easy to confuse.
 */
export function StackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.6 22 7.3l-10 4.7L2 7.3l10-4.7Zm8.4 8.2 1.6.7-10 4.7-10-4.7 1.6-.7L12 14.6l8.4-3.8Zm0 4.6 1.6.8-10 4.7-10-4.7 1.6-.8L12 19.2l8.4-3.8Z" />
    </Svg>
  );
}

/** Networks: the wired nodes (fa-network-wired). */
export function NetworkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 3h6c.6 0 1 .4 1 1v3c0 .6-.4 1-1 1h-2v2h5.5c.3 0 .5.2.5.5V13h1c.6 0 1 .4 1 1v3c0 .6-.4 1-1 1h-4c-.6 0-1-.4-1-1v-3c0-.6.4-1 1-1h1v-1.5h-11V13h1c.6 0 1 .4 1 1v3c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1v-3c0-.6.4-1 1-1h1v-1.5c0-.3.2-.5.5-.5H11V8H9c-.6 0-1-.4-1-1V4c0-.6.4-1 1-1Z" />
    </Svg>
  );
}

/** Disks: the database cylinder (fa-database). */
export function DatabaseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5c4.4 0 8 1.2 8 2.8S16.4 8 12 8 4 6.8 4 5.3s3.6-2.8 8-2.8ZM4 8.2C5.6 9.2 8.6 9.8 12 9.8s6.4-.6 8-1.6v3.1c0 1.5-3.6 2.7-8 2.7s-8-1.2-8-2.7V8.2Zm0 5.7c1.6 1 4.6 1.6 8 1.6s6.4-.6 8-1.6v4.8c0 1.5-3.6 2.8-8 2.8s-8-1.3-8-2.8v-4.8Z" />
    </Svg>
  );
}

/** Application codes: the collector's asterisk (fa-asterisk). */
export function AsteriskIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.6 3h2.8v6l5.2-3 1.4 2.4-5.2 3 5.2 3-1.4 2.4-5.2-3v6h-2.8v-6l-5.2 3L4 14.4l5.2-3-5.2-3L5.4 6l5.2 3V3Z" />
    </Svg>
  );
}

/** Groups: the collector's silhouettes (fa-users). */
/** Service instance: the collector's half-filled disc (fa-adjust, `svcinstance`). */
export function InstanceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm0 2.2v14.6a7.3 7.3 0 0 0 0-14.6Z" />
    </Svg>
  );
}

/** Obsolescence: the collector's life ring (fa-life-ring, `obs16`). */
export function LifeRingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm-4.6 3.3A7.3 7.3 0 0 0 5.8 7.4l2.5 2.5c.4-.7.9-1.2 1.6-1.6L7.4 5.8Zm9.2 0-2.5 2.5c.7.4 1.2.9 1.6 1.6l2.5-2.5a7.3 7.3 0 0 0-1.6-1.6ZM12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Zm-3.7 4.7-2.5 2.5c.5.6 1 1.1 1.6 1.6l2.5-2.5c-.7-.4-1.2-.9-1.6-1.6Zm7.4 0c-.4.7-.9 1.2-1.6 1.6l2.5 2.5c.6-.5 1.1-1 1.6-1.6l-2.5-2.5Z"
      />
    </Svg>
  );
}

/** Refresh: the two arrows in a circle (fa-sync). */
export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5a7.5 7.5 0 0 1 6.9 4.5H16a1 1 0 1 0 0 2h5a1 1 0 0 0 1-1V5a1 1 0 1 0-2 0v2.1A9.5 9.5 0 0 0 2.6 10.8a1 1 0 0 0 2 .3A7.5 7.5 0 0 1 12 4.5Zm8.6 7.8a1 1 0 0 0-1.2.9A7.5 7.5 0 0 1 5.1 15H8a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-2.1a9.5 9.5 0 0 0 17.4-3.7 1 1 0 0 0-.8-1Z" />
    </Svg>
  );
}

/** Log: the collector's clock turning back time (fa-history, `log16`). */
export function HistoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12.5 3a9 9 0 1 1-8.3 12.5 1 1 0 0 1 1.9-.8A7 7 0 1 0 6 8.4h2.3a1 1 0 1 1 0 2H3.7a1 1 0 0 1-1-1V4.8a1 1 0 0 1 2 0v1.8A9 9 0 0 1 12.5 3Zm-.2 4c.6 0 1 .4 1 1v3.6l2.6 1.6a1 1 0 1 1-1 1.7l-3.1-1.9a1 1 0 0 1-.5-.9V8c0-.6.4-1 1-1Z" />
    </Svg>
  );
}

/** Filter: the collector's funnel (fa-filter, `filter16`). */
export function FilterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 4h17a1 1 0 0 1 .8 1.6L14.5 14v5.4a1 1 0 0 1-.5.9l-3 1.7a1 1 0 0 1-1.5-.9V14L2.7 5.6A1 1 0 0 1 3.5 4Z" />
    </Svg>
  );
}

/** User: the collector's single silhouette (fa-user, `guy16`). */
export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 1.8c-3.9 0-8 2-8 4.7V21h16v-2.5c0-2.7-4.1-4.7-8-4.7Z" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8.2.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.5 12.6c-3.2 0-6.5 1.6-6.5 3.7V20h13v-3.7c0-2.1-3.3-3.7-6.5-3.7Zm8.2.3c-.7 0-1.4.1-2 .3 1.3 1 2.1 2.3 2.1 3.7V20H22v-3.3c0-1.9-2.6-3.1-5.3-3.1Z" />
    </Svg>
  );
}

/* --- Utility icons. Neutral: these are commands, not objects. --- */

/** Opening a dropdown menu. */
export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.3 8.3a1 1 0 0 1 1.4 0L12 13.6l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.4Z" />
    </Svg>
  );
}

/** Sign out (fa-sign-out-alt). */
export function SignOutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 3h7a1 1 0 1 1 0 2H5v14h7a1 1 0 1 1 0 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm11.3 4.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4-1.4l2.3-2.3H9a1 1 0 1 1 0-2h9.6l-2.3-2.3a1 1 0 0 1 0-1.4Z" />
    </Svg>
  );
}

/** Column picker. */
export function ColumnsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 4h4c.3 0 .5.2.5.5v15c0 .3-.2.5-.5.5h-4a.5.5 0 0 1-.5-.5v-15c0-.3.2-.5.5-.5Zm6.5 0h4c.3 0 .5.2.5.5v15c0 .3-.2.5-.5.5h-4a.5.5 0 0 1-.5-.5v-15c0-.3.2-.5.5-.5Zm6.5 0h4c.3 0 .5.2.5.5v15c0 .3-.2.5-.5.5h-4a.5.5 0 0 1-.5-.5v-15c0-.3.2-.5.5-.5Z" />
    </Svg>
  );
}

/** Filter field. */
export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.5 3a7.5 7.5 0 1 1-4.7 13.3l-2.6 2.6a1.2 1.2 0 0 1-1.7-1.7l2.6-2.6A7.5 7.5 0 0 1 10.5 3Zm0 2.4a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Z" />
    </Svg>
  );
}

/** Back to the default values. */
export function ResetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4a8 8 0 1 1-7.6 10.5 1.2 1.2 0 0 1 2.3-.8A5.6 5.6 0 1 0 12 6.4c-1.4 0-2.7.5-3.7 1.4l1.9 1.9c.4.4.1 1-.4 1H4.3a.6.6 0 0 1-.6-.6V4.6c0-.5.6-.8 1-.4l1.6 1.6A8 8 0 0 1 12 4Z" />
    </Svg>
  );
}

/** Closing a panel. */
export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.2 4.5 12 10.3l5.8-5.8a1.2 1.2 0 0 1 1.7 1.7L13.7 12l5.8 5.8a1.2 1.2 0 0 1-1.7 1.7L12 13.7l-5.8 5.8a1.2 1.2 0 0 1-1.7-1.7l5.8-5.8-5.8-5.8a1.2 1.2 0 0 1 1.7-1.7Z" />
    </Svg>
  );
}

/** Deletion. */
export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.4 2.5h5.2c.6 0 1.1.5 1.1 1.1v1.1h4a1 1 0 1 1 0 2h-.7l-.9 12.1a2.2 2.2 0 0 1-2.2 2.1H8.1a2.2 2.2 0 0 1-2.2-2.1L5 6.7h-.7a1 1 0 1 1 0-2h4V3.6c0-.6.5-1.1 1.1-1.1Zm.7 2.2h3.8v-.2h-3.8v.2ZM9.9 9a.8.8 0 0 0-.8.8v7.6a.8.8 0 0 0 1.6 0V9.8a.8.8 0 0 0-.8-.8Zm4.2 0a.8.8 0 0 0-.8.8v7.6a.8.8 0 0 0 1.6 0V9.8a.8.8 0 0 0-.8-.8Z" />
    </Svg>
  );
}

/* --- Column families, taken from the classes of the historical collector. --- */

/** Cluster (fa-circle-notch). */
export function ClusterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a9 9 0 1 1-8.3 5.5 1.2 1.2 0 1 1 2.2.9A6.6 6.6 0 1 0 12 5.4a1.2 1.2 0 0 1 0-2.4Z" />
    </Svg>
  );
}

/** Environment (fa-clone). */
export function EnvIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 3h11c.8 0 1.5.7 1.5 1.5v11c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5v-11C7 3.7 7.7 3 8.5 3ZM4.5 7H6v9.5c0 .8.7 1.5 1.5 1.5H17v1.5c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5v-11C3 7.7 3.7 7 4.5 7Z" />
    </Svg>
  );
}

/** Security zone (fa-fire). */
export function FirewallIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.2c.3 2.6-.8 4.2-2.1 5.7-1.4 1.6-3 3.1-3 6.1a5.1 5.1 0 0 0 10.2 0c0-1.4-.5-2.5-1.2-3.5-.3.7-.9 1.2-1.7 1.2-1.1 0-1.8-.8-1.8-2 0-2.1.7-4.6-.4-7.5Zm0 11.1c1 1.3 1.6 2 1.6 3a1.6 1.6 0 0 1-3.2 0c0-1 .6-1.7 1.6-3Z" />
    </Svg>
  );
}

/** Location (fa-map-marker). */
export function LocationIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.2a7 7 0 0 0-7 7c0 5 6.2 12 6.4 12.3.3.4.9.4 1.2 0 .2-.3 6.4-7.3 6.4-12.3a7 7 0 0 0-7-7Zm0 9.8a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Z" />
    </Svg>
  );
}

/** Hypervisor (fa-cloud). */
export function CloudIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17.6 10.1a5.6 5.6 0 0 0-10.5-1.7A4.6 4.6 0 0 0 7.6 19h9.6a4.5 4.5 0 0 0 .4-8.9Z" />
    </Svg>
  );
}

/** Operating system. */
export function OsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 4h16c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H4c-.8 0-1.5-.7-1.5-1.5v-13C2.5 4.7 3.2 4 4 4Zm0 4.6v9.4h16V8.6H4Zm1.6-3.1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm2.8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
    </Svg>
  );
}

/** Processor (fa-microchip). */
export function CpuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.2 2a.8.8 0 0 1 .8.8V4h1.2V2.8a.8.8 0 1 1 1.6 0V4H14V2.8a.8.8 0 1 1 1.6 0V4h1.1c1.3 0 2.3 1 2.3 2.3v1.1h1.2a.8.8 0 1 1 0 1.6H19v1.2h1.2a.8.8 0 1 1 0 1.6H19v1.2h1.2a.8.8 0 1 1 0 1.6H19v1.1c0 1.3-1 2.3-2.3 2.3h-1.1V20a.8.8 0 1 1-1.6 0v-1.2h-1.2V20a.8.8 0 1 1-1.6 0v-1.2H10V20a.8.8 0 1 1-1.6 0v-1.2H7.3A2.3 2.3 0 0 1 5 16.5v-1.1H3.8a.8.8 0 1 1 0-1.6H5v-1.2H3.8a.8.8 0 1 1 0-1.6H5V9.8H3.8a.8.8 0 1 1 0-1.6H5V7.1c0-1.3 1-2.3 2.3-2.3h1.1V2.8c0-.4.4-.8.8-.8Zm-.7 6.2c-.3 0-.5.2-.5.5v6.6c0 .3.2.5.5.5h6.6c.3 0 .5-.2.5-.5V8.7c0-.3-.2-.5-.5-.5H8.5Z" />
    </Svg>
  );
}

/** Memory (fa-memory). */
export function MemoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.8 6h18.4c.7 0 1.3.6 1.3 1.3V11h-.8c-.7 0-1.2.6-1.2 1.3s.5 1.2 1.2 1.2h.8v3.2c0 .7-.6 1.3-1.3 1.3H2.8c-.7 0-1.3-.6-1.3-1.3v-3.2h.8c.7 0 1.2-.5 1.2-1.2s-.5-1.3-1.2-1.3h-.8V7.3C1.5 6.6 2.1 6 2.8 6Zm3.4 3.2v4.2h2.2V9.2H6.2Zm4.5 0v4.2h2.2V9.2h-2.2Zm4.5 0v4.2h2.2V9.2h-2.2Z" />
    </Svg>
  );
}

/** Timestamp (fa-clock). */
export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm0 2.2a7.3 7.3 0 1 0 0 14.6 7.3 7.3 0 0 0 0-14.6Zm-.1 2.3c.5 0 1 .4 1 1v4.3l3 1.8c.4.3.6.9.3 1.3-.3.5-.9.6-1.3.3l-3.5-2.1a1 1 0 0 1-.5-.9V8a1 1 0 0 1 1-1Z" />
    </Svg>
  );
}

/** Date, in front of a timestamp in the lists (fa-calendar-alt). */
export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d="M8 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1ZM5 10v9h14v-9H5Zm2 2h4v4H7v-4Z"
      />
    </Svg>
  );
}

/** Power supply (fa-bolt). */
export function PowerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.6 2 5.8 12.4c-.4.5-.1 1.2.6 1.2h4.2l-1.4 8 8.9-10.4c.4-.5.1-1.2-.6-1.2h-4.2l1.3-8Z" />
    </Svg>
  );
}

/** Notifications (fa-bell). */
export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.2c.9 0 1.6.7 1.6 1.6v.6a6.2 6.2 0 0 1 4.6 6v2.8l1.5 2.4c.4.6 0 1.4-.8 1.4H5.1c-.7 0-1.2-.8-.8-1.4l1.5-2.4v-2.8a6.2 6.2 0 0 1 4.6-6v-.6c0-.9.7-1.6 1.6-1.6Zm0 19.6a2.6 2.6 0 0 1-2.5-2h5a2.6 2.6 0 0 1-2.5 2Z" />
    </Svg>
  );
}

/** Disaster recovery plan (fa-bomb, the collector's `drp16` class). */
export function DrpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17.6 3a1 1 0 0 1 1 1v.6h.6a1 1 0 1 1 0 2h-.6v.6a1 1 0 1 1-2 0v-.6H16a1 1 0 1 1 0-2h.6V4a1 1 0 0 1 1-1Zm-3.1 3.6 1.3 1.3-1.5 1.5a7.5 7.5 0 1 1-2.1-1.4l1.4-1.4ZM9.5 11a4.5 4.5 0 0 0-3.2 1.3 1 1 0 1 0 1.4 1.4A2.5 2.5 0 0 1 9.5 13a1 1 0 1 0 0-2Z" />
    </Svg>
  );
}

/** State of an object, rendered as a badge. */
export function StateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 6.5h9a5.5 5.5 0 0 1 0 11h-9a5.5 5.5 0 0 1 0-11Zm0 2a3.5 3.5 0 1 0 0 7h9a3.5 3.5 0 1 0 0-7h-9Zm0 1.6a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Z" />
    </Svg>
  );
}

/** Editing. */
export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17.6 2.6c.5 0 1 .2 1.4.6l1.8 1.8a2 2 0 0 1 0 2.8L9.2 19.4l-5.7 1.9a.7.7 0 0 1-.9-.9l1.9-5.7L16.2 3.2c.4-.4.9-.6 1.4-.6Zm-2.2 3.9L6 15.9l-1 3.1 3.1-1 9.4-9.4-2.1-2.1Z" />
    </Svg>
  );
}

/** Confirming an entry. */
export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.3 5.6a1.2 1.2 0 0 1 0 1.7L10 17.6a1.2 1.2 0 0 1-1.7 0l-4.6-4.6a1.2 1.2 0 1 1 1.7-1.7l3.7 3.7 9.5-9.4a1.2 1.2 0 0 1 1.7 0Z" />
    </Svg>
  );
}

/** Folder of forms, in the request catalog (fa-folder-open). */
export function FolderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 5h5.2c.5 0 .9.2 1.2.6L11 7h7.5c.8 0 1.5.7 1.5 1.5V10H7.2c-.7 0-1.3.4-1.5 1.1L3 18.2V6.5C3 5.7 3.7 5 4.5 5h-1Zm3.7 6.5h14.3c.7 0 1.2.7.9 1.4l-2.3 6c-.2.6-.8 1.1-1.5 1.1H4.1c-.7 0-1.2-.7-.9-1.4l2.5-6c.3-.7.8-1.1 1.5-1.1Z" />
    </Svg>
  );
}

/** Form: the collector's puzzle piece (fa-puzzle-piece, `wf16`). */
export function PuzzleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 3.5a2.5 2.5 0 0 1 5 0V5h3.5c.8 0 1.5.7 1.5 1.5V10h-1.5a2.5 2.5 0 0 0 0 5H20v3.5c0 .8-.7 1.5-1.5 1.5H15v-1.5a2.5 2.5 0 0 0-5 0V20H6.5c-.8 0-1.5-.7-1.5-1.5V15H3.5a2.5 2.5 0 0 1 0-5H5V6.5C5 5.7 5.7 5 6.5 5H10V3.5Z" />
    </Svg>
  );
}

/** Adding an item to a list. */
export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5c.7 0 1.2.5 1.2 1.2v6.1h6.1a1.2 1.2 0 1 1 0 2.4h-6.1v6.1a1.2 1.2 0 1 1-2.4 0v-6.1H4.7a1.2 1.2 0 1 1 0-2.4h6.1V4.7c0-.7.5-1.2 1.2-1.2Z" />
    </Svg>
  );
}

/** Freezing of an object: the historical collector's snowflake (fa-snowflake). */
export function SnowflakeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 1.8c.6 0 1.1.5 1.1 1.1v1.5l1.3-1.3a1.1 1.1 0 0 1 1.6 1.6l-2.9 2.9v2.5l2.2-1.3 1-4a1.1 1.1 0 1 1 2.2.6l-.5 1.8 1.3-.8a1.1 1.1 0 1 1 1.1 2l-1.3.7 1.8.5a1.1 1.1 0 0 1-.6 2.2l-4-1.1-2.2 1.3 2.2 1.3 4-1.1a1.1 1.1 0 0 1 .6 2.2l-1.8.5 1.3.7a1.1 1.1 0 1 1-1.1 2l-1.3-.8.5 1.8a1.1 1.1 0 1 1-2.2.6l-1-4-2.2-1.3v2.5l2.9 2.9a1.1 1.1 0 0 1-1.6 1.6l-1.3-1.3v1.5a1.1 1.1 0 1 1-2.2 0v-1.5l-1.3 1.3a1.1 1.1 0 0 1-1.6-1.6l2.9-2.9v-2.5l-2.2 1.3-1 4a1.1 1.1 0 1 1-2.2-.6l.5-1.8-1.3.8a1.1 1.1 0 1 1-1.1-2l1.3-.7-1.8-.5a1.1 1.1 0 0 1 .6-2.2l4 1.1 2.2-1.3-2.2-1.3-4 1.1a1.1 1.1 0 1 1-.6-2.2l1.8-.5-1.3-.7a1.1 1.1 0 1 1 1.1-2l1.3.8-.5-1.8a1.1 1.1 0 0 1 2.2-.6l1 4 2.2 1.3V7.6L8 4.7a1.1 1.1 0 0 1 1.6-1.6l1.3 1.3V2.9c0-.6.5-1.1 1.1-1.1Z" />
    </Svg>
  );
}
