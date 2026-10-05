import { useMemo } from "react";
import { parseAnsi, type AnsiSegment } from "@/lib/ansi";

/**
 * Terminal colours mapped onto the tokens. The colour only echoes what the text
 * already says (a level, a word), so it never carries a meaning of its own.
 */
const COLOR_CLASS: Record<NonNullable<AnsiSegment["color"]>, string> = {
  dim: "text-ink-muted",
  black: "text-ink",
  white: "text-ink",
  red: "text-state-down",
  green: "text-state-up",
  yellow: "text-state-warn",
  blue: "text-accent",
  magenta: "text-accent",
  cyan: "text-accent",
};

/** Text written for a terminal, its colours rendered and its other escapes dropped. */
export function AnsiText({ text }: { text: string }) {
  const segments = useMemo(() => parseAnsi(text), [text]);
  return segments.map((segment, index) =>
    segment.color === undefined && !segment.bold ? (
      segment.text
    ) : (
      <span
        key={index}
        className={`${segment.color === undefined ? "" : COLOR_CLASS[segment.color]} ${segment.bold ? "font-semibold" : ""}`}
      >
        {segment.text}
      </span>
    ),
  );
}
