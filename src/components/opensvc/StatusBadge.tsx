import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type ObjectState = "up" | "warn" | "down" | "unknown";

const styles: Record<ObjectState, { ink: string; glyph: string }> = {
  up: { ink: "text-state-up", glyph: "●" },
  warn: { ink: "text-state-warn", glyph: "▲" },
  down: { ink: "text-state-down", glyph: "■" },
  unknown: { ink: "text-state-unknown", glyph: "○" },
};

/**
 * State of an OpenSVC object: a shape, a tint and a label, without a coloured
 * background. The shape tells the states apart without colour, to stay readable for
 * colour blindness or greyscale printing.
 *
 * Fixed width, cut for the longest label ("stdby down"): in a column, the badges
 * line up as a regular block, glyphs included, whatever the state. `label` replaces
 * the label of the state when the agent's value is more precise, such as "stdby up"
 * shown with the shape of "up".
 */
export function StatusBadge({
  state,
  label,
  className,
}: {
  state: ObjectState;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const s = styles[state];
  return (
    <span
      className={cn(
        "inline-flex w-[6.5rem] items-center gap-1 text-data leading-5 font-medium whitespace-nowrap",
        s.ink,
        className,
      )}
    >
      <span aria-hidden="true" className="text-[0.625rem]">
        {s.glyph}
      </span>
      {label ?? t(`state.${state}`)}
    </span>
  );
}
