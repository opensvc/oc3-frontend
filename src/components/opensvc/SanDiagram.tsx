import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { filterKey } from "@/lib/column-filters";
import { ObjectIcon, type ObjectKind } from "./ObjectIcon";

type SanTopology = components["schemas"]["SanTopology"];
type SanNode = components["schemas"]["SanTopologyNode"];
type SanLink = components["schemas"]["SanTopologyLink"];

/** Geometry of the diagram, in pixels. The boxes have a fixed width and row heights. */
const BOX_WIDTH = 150;
const COLUMN_GAP = 88;
const HEAD_HEIGHT = 26;
const PORT_HEIGHT = 20;
const BOX_GAP = 16;
const BORDER = 1;
/** Distance between the lines of the members of a trunk. */
const TRUNK_SPREAD = 3;

/** Speeds with a colour of their own (`--san-*` tokens); the others share one. */
const SPEEDS = [1, 2, 4, 8, 16, 32, 64] as const;
type SpeedKey = (typeof SPEEDS)[number] | "other";

/** Written out in full: Tailwind does not see names built at runtime. */
const STROKE: Record<SpeedKey, string> = {
  1: "stroke-san-1",
  2: "stroke-san-2",
  4: "stroke-san-4",
  8: "stroke-san-8",
  16: "stroke-san-16",
  32: "stroke-san-32",
  64: "stroke-san-64",
  other: "stroke-san-other",
};
const SWATCH: Record<SpeedKey, string> = {
  1: "bg-san-1",
  2: "bg-san-2",
  4: "bg-san-4",
  8: "bg-san-8",
  16: "bg-san-16",
  32: "bg-san-32",
  64: "bg-san-64",
  other: "bg-san-other",
};

function speedKey(speed: number): SpeedKey {
  return SPEEDS.find((known) => known === speed) ?? "other";
}

const KIND_ICON: Record<SanNode["kind"], ObjectKind> = {
  server: "node",
  switch: "switch",
  array: "disk",
};

interface Box {
  node: SanNode;
  /** Ports in the order they are drawn. */
  ports: string[];
  x: number;
  y: number;
  height: number;
}

/**
 * Places the devices: one column per rank, from the node on the left to the arrays
 * on the right, each column centred on the tallest one.
 *
 * The ports of a switch are listed by index. Those of the node and of an array are
 * ordered after the device they lead to, so that the links of two fabrics run side
 * by side rather than across each other.
 */
function layout(topology: SanTopology): { boxes: Map<string, Box>; width: number; height: number } {
  const ranks = [...new Set(topology.nodes.map((node) => node.rank))].sort((a, b) => a - b);
  const columns = ranks.map((rank) => topology.nodes.filter((node) => node.rank === rank));
  // Where each device stands in its column, and each port in its device.
  const order = new Map<string, number>();
  for (const column of columns) column.forEach((node, index) => order.set(node.id, index));
  const peerOf = (node: SanNode, port: string): [number, number] => {
    for (const link of topology.links) {
      const peer =
        link.tail === node.id && link.tail_port === port
          ? { id: link.head, port: link.head_port }
          : link.head === node.id && link.head_port === port
            ? { id: link.tail, port: link.tail_port }
            : undefined;
      if (peer === undefined) continue;
      const peerNode = topology.nodes.find((candidate) => candidate.id === peer.id);
      return [order.get(peer.id) ?? 0, peerNode?.ports.indexOf(peer.port) ?? 0];
    }
    return [0, 0];
  };
  const portsOf = (node: SanNode): string[] => {
    if (node.kind === "switch") return node.ports;
    return [...node.ports].sort((a, b) => {
      const [deviceA, portA] = peerOf(node, a);
      const [deviceB, portB] = peerOf(node, b);
      return deviceA - deviceB || portA - portB || a.localeCompare(b);
    });
  };

  const heightOf = (node: SanNode) => HEAD_HEIGHT + node.ports.length * PORT_HEIGHT + 2 * BORDER;
  const columnHeight = (column: SanNode[]) =>
    column.reduce((sum, node) => sum + heightOf(node), 0) + (column.length - 1) * BOX_GAP;
  const height = Math.max(0, ...columns.map(columnHeight));
  const boxes = new Map<string, Box>();
  columns.forEach((column, index) => {
    let y = (height - columnHeight(column)) / 2;
    for (const node of column) {
      boxes.set(node.id, {
        node,
        ports: portsOf(node),
        x: index * (BOX_WIDTH + COLUMN_GAP),
        y,
        height: heightOf(node),
      });
      y += heightOf(node) + BOX_GAP;
    }
  });
  const width = columns.length * BOX_WIDTH + Math.max(0, columns.length - 1) * COLUMN_GAP;
  return { boxes, width, height };
}

/** Middle of the row of a port, on the side of the box facing the other device. */
function anchor(box: Box, port: string, side: "left" | "right"): { x: number; y: number } {
  const index = Math.max(0, box.ports.indexOf(port));
  return {
    x: side === "left" ? box.x : box.x + BOX_WIDTH,
    y: box.y + BORDER + HEAD_HEIGHT + index * PORT_HEIGHT + PORT_HEIGHT / 2,
  };
}

/**
 * Diagram of a SAN wiring: the node and its adapter ports on the left, the switches
 * they go through in the middle, the arrays and their target ports on the right,
 * with a line per physical link between the ports it joins. This is the diagram the
 * historical collector drew with graphviz in the storage tab of a node.
 *
 * A line is coloured after its speed, which is also written on it: the colour alone
 * says nothing. A trunk between two switches is drawn as one line per member. The
 * name of a switch leads to its ports in the SAN Switches view. The links are also
 * listed as text for assistive technologies.
 */
export function SanDiagram({ topology }: { topology: SanTopology }) {
  const { t } = useTranslation();

  if (topology.links.length === 0)
    return <p className="text-ink-muted">{t("storage.san.empty")}</p>;

  const { boxes, width, height } = layout(topology);
  const labelOf = (node: SanNode) =>
    node.label === "" && node.kind === "array" ? t("storage.san.unknownArray") : node.label;
  const speedText = (link: SanLink) => {
    const speed = link.speeds[0] ?? 0;
    const one = speed > 0 ? t("storage.san.speed", { speed }) : t("storage.san.speedUnknown");
    return link.speeds.length > 1
      ? t("storage.san.trunk", { count: link.speeds.length, speed: one })
      : one;
  };
  const server = topology.nodes.find((node) => node.kind === "server");
  const speeds = [...new Set(topology.links.flatMap((link) => link.speeds.map(speedKey)))].sort(
    (a, b) => (a === "other" ? 1 : b === "other" ? -1 : a - b),
  );

  const drawn = topology.links.flatMap((link) => {
    const tail = boxes.get(link.tail);
    const head = boxes.get(link.head);
    if (tail === undefined || head === undefined) return [];
    // From the right of the device nearer to the node to the left of the other.
    const forward = tail.x <= head.x;
    const from = anchor(tail, link.tail_port, forward ? "right" : "left");
    const to = anchor(head, link.head_port, forward ? "left" : "right");
    const bend = (to.x - from.x) / 2;
    const members = link.speeds.length === 0 ? [0] : link.speeds;
    return [{ link, tail, head, from, to, bend, members }];
  });

  return (
    <figure aria-label={t("storage.san.label", { name: server?.label ?? "" })} className="m-0">
      <div className="overflow-x-auto pb-1">
        <div className="relative" style={{ width, height }}>
          <svg aria-hidden="true" width={width} height={height} className="absolute inset-0">
            {drawn.map(({ link, from, to, bend, members }) => (
              <g key={`${link.tail}:${link.tail_port}:${link.head}:${link.head_port}`}>
                <title>{speedText(link)}</title>
                {members.map((speed, index) => {
                  const shift = (index - (members.length - 1) / 2) * TRUNK_SPREAD;
                  return (
                    <path
                      key={index}
                      d={`M ${String(from.x)} ${String(from.y + shift)} C ${String(from.x + bend)} ${String(from.y + shift)}, ${String(to.x - bend)} ${String(to.y + shift)}, ${String(to.x)} ${String(to.y + shift)}`}
                      className={`fill-none stroke-[1.5] ${STROKE[speedKey(speed)]}`}
                    />
                  );
                })}
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 4}
                  textAnchor="middle"
                  // A halo of the background keeps the speed readable over a line.
                  className="fill-ink-muted stroke-surface-raised stroke-[3px] text-[0.625rem] [paint-order:stroke]"
                >
                  {speedText(link)}
                </text>
              </g>
            ))}
          </svg>
          {[...boxes.values()].map((box) => (
            <div
              key={box.node.id}
              className="absolute overflow-hidden rounded-(--radius-panel) border border-line-strong bg-surface"
              style={{ left: box.x, top: box.y, width: BOX_WIDTH, height: box.height }}
            >
              <div
                className="flex items-center gap-1 bg-surface-sunken px-1.5 font-medium"
                style={{ height: HEAD_HEIGHT }}
                title={[
                  `${t(`storage.san.kinds.${box.node.kind}`)}: ${labelOf(box.node)}`,
                  box.node.fabric === undefined || box.node.fabric === ""
                    ? ""
                    : t("storage.san.fabric", { name: box.node.fabric }),
                ]
                  .filter((line) => line !== "")
                  .join("\n")}
              >
                <ObjectIcon kind={KIND_ICON[box.node.kind]} className="h-3.5 w-3.5 shrink-0" />
                <span className="sr-only">{t(`storage.san.kinds.${box.node.kind}`)}</span>
                {box.node.kind === "switch" ? (
                  <Link
                    to="/san-switches"
                    search={{ [filterKey("sw_name")]: `eq:${box.node.label}` }}
                    title={t("storage.san.openSwitch", { name: box.node.label })}
                    className="truncate hover:underline"
                  >
                    {labelOf(box.node)}
                  </Link>
                ) : (
                  <span className="truncate">{labelOf(box.node)}</span>
                )}
              </div>
              {box.ports.map((port) => (
                <div
                  key={port}
                  title={port}
                  className="truncate border-t border-line px-1.5 text-center font-mono text-[0.6875rem] text-ink-muted"
                  style={{ height: PORT_HEIGHT, lineHeight: `${String(PORT_HEIGHT - BORDER)}px` }}
                >
                  {port}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-data text-ink-muted">
        <span>{t("storage.san.legend")}</span>
        {speeds.map((speed) => (
          <span key={speed} className="flex items-center gap-1">
            <span aria-hidden="true" className={`inline-block h-0.5 w-5 ${SWATCH[speed]}`} />
            {speed === "other" ? t("storage.san.speedOther") : t("storage.san.speed", { speed })}
          </span>
        ))}
      </figcaption>
      <ul className="sr-only">
        {drawn.map(({ link, tail, head }) => (
          <li key={`${link.tail}:${link.tail_port}:${link.head}:${link.head_port}`}>
            {t("storage.san.link", {
              tail: labelOf(tail.node),
              tailPort: t("storage.san.port", { port: link.tail_port }),
              head: labelOf(head.node),
              headPort: t("storage.san.port", { port: link.head_port }),
              speed: speedText(link),
            })}
          </li>
        ))}
      </ul>
    </figure>
  );
}
