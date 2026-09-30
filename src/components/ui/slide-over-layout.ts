/**
 * Where a side panel has room for something hanging outside its left edge, the
 * history rail say: the window must be wider than the panel by that much. Below,
 * the panel takes the whole width and the rail gives way to a fallback placed in
 * the header. The classes are written out in full: Tailwind does not see names
 * built at runtime.
 */
export type SlideOverSize = "default" | "wide" | "wider";

/** Shown only where the rail fits beside the panel. */
export const RAIL_VISIBLE: Record<SlideOverSize, string> = {
  default: "hidden md:flex",
  wide: "hidden lg:flex",
  wider: "hidden lg:flex",
};

/** Shown only where the rail does not fit. */
export const RAIL_FALLBACK: Record<SlideOverSize, string> = {
  default: "md:hidden",
  wide: "lg:hidden",
  wider: "lg:hidden",
};
