import type { ReactNode } from "react";
import { parseLegacyCss } from "./legacy-css";

/**
 * The icon a legacy class list names, sized by the caller; `fallback` when it
 * names none. Decorative: the text next to it says what it is.
 */
export function LegacyCssIcon({
  css,
  className = "h-4 w-4",
  fallback = null,
}: {
  css: string | undefined;
  className?: string;
  fallback?: ReactNode;
}) {
  const { icon } = parseLegacyCss(css);
  if (icon === null) return fallback;
  const { Icon, tone } = icon;
  return <Icon className={`shrink-0 ${tone} ${className}`} />;
}
