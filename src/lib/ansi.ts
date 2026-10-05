/** The eight base colours of a terminal, bright variants folded onto them. */
export type AnsiColor =
  "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white";

const COLORS: AnsiColor[] = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

/** A run of text sharing the same graphic rendition. */
export interface AnsiSegment {
  text: string;
  color?: AnsiColor | "dim";
  bold: boolean;
}

// CSI sequences (SGR included), OSC sequences ended by BEL or ST, and the other
// two-character escapes.
// eslint-disable-next-line no-control-regex
const ESCAPE = /\x1b\[([0-9;?]*)([@-~])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;

/**
 * Splits terminal output into segments by their SGR colour and weight. Every other
 * escape sequence (cursor moves, line erasure, titles) is dropped: the text is shown
 * as a log, not replayed on a terminal.
 */
export function parseAnsi(input: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let color: AnsiSegment["color"];
  let bold = false;
  let last = 0;
  const push = (text: string) => {
    if (text === "") return;
    const previous = segments.at(-1);
    if (previous !== undefined && previous.color === color && previous.bold === bold)
      previous.text += text;
    else segments.push({ text, color, bold });
  };
  for (const match of input.matchAll(ESCAPE)) {
    push(input.slice(last, match.index));
    last = match.index + match[0].length;
    if (match[2] !== "m") continue;
    const params = (match[1] ?? "") === "" ? [0] : (match[1] ?? "").split(";").map(Number);
    for (let i = 0; i < params.length; i++) {
      const code = params[i] ?? 0;
      if (code === 0) {
        color = undefined;
        bold = false;
      } else if (code === 1) bold = true;
      else if (code === 22) bold = false;
      else if (code === 39) color = undefined;
      else if (code === 90) color = "dim";
      else if (code >= 30 && code <= 37) color = COLORS[code - 30];
      else if (code >= 91 && code <= 97) color = COLORS[code - 90];
      // 256-colour and true-colour forms: their arguments are skipped, the colour
      // left as it is for want of a token to show it with.
      else if (code === 38 || code === 48) i += params[i + 1] === 5 ? 2 : 4;
    }
  }
  push(input.slice(last));
  return segments;
}

/** The text of terminal output, without its escape sequences. */
export function stripAnsi(input: string): string {
  return input.replace(ESCAPE, "");
}
