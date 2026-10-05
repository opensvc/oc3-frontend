import { useLayoutEffect, type RefObject } from "react";

/**
 * Places `element`, rendered in fixed position, under `anchor` while `open`: above
 * it when the space below is short, kept inside the window, and following it when
 * the page or a container scrolls (hence the capture) or the window is resized.
 * The style is written on the element before paint, without a render.
 *
 * For the popovers of the controls sitting in a table header: rendered in
 * `document.body`, they are not clipped by the scrolling container of the table.
 */
export function useAnchoredPlacement(
  open: boolean,
  anchor: RefObject<HTMLElement | null>,
  element: RefObject<HTMLElement | null>,
  { matchWidth = true }: { matchWidth?: boolean } = {},
) {
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const box = anchor.current?.getBoundingClientRect();
      const target = element.current;
      if (box === undefined || target === null) return;
      const gap = 4;
      const below = window.innerHeight - box.bottom - gap;
      const above = box.top - gap;
      const upward = target.scrollHeight > below && above > below;
      target.style.left = `${String(Math.max(gap, Math.min(box.left, window.innerWidth - target.offsetWidth - gap)))}px`;
      if (matchWidth) target.style.minWidth = `${String(box.width)}px`;
      target.style.maxHeight = `${String(Math.max(upward ? above : below, 80))}px`;
      if (upward) {
        target.style.top = "";
        target.style.bottom = `${String(window.innerHeight - box.top + gap)}px`;
      } else {
        target.style.bottom = "";
        target.style.top = `${String(box.bottom + gap)}px`;
      }
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchor, element, matchWidth]);
}
