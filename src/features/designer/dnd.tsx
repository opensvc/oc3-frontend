import { useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DragContext, useDrag, type DragHintState, type DragItem } from "./drag";
import type { Refusal } from "./model";

/** Holds what is being dragged in the designer, for its drop targets. */
export function DragProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<DragItem | null>(null);
  const [hint, setHint] = useState<DragHintState | null>(null);
  const lastRefusal = useRef<{ refusal: Refusal; at: number } | null>(null);
  const value = useMemo(() => ({ item, setItem, hint, setHint, lastRefusal }), [item, hint]);
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

/** The line at the bottom of the page telling what the current drag would do. */
export function DragHint() {
  const { item, hint } = useDrag();
  const { t } = useTranslation();
  if (item === null) return null;
  return (
    <div
      role="status"
      className={`pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border px-3 py-1 text-data shadow ${
        hint?.refused === true
          ? "border-state-down bg-surface-raised text-state-down"
          : "border-line bg-surface-raised text-ink"
      }`}
    >
      {hint === null ? t("designer.drag.idle") : `${hint.refused ? "■ " : "→ "}${hint.text}`}
    </div>
  );
}
