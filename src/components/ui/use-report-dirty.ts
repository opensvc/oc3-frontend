import { createContext, useContext, useEffect, useRef } from "react";

/**
 * The drawer a form is in (`SlideOver`), told when the form starts or stops holding
 * an entry not saved yet. Null out of a drawer.
 */
export const DirtyFormsContext = createContext<((form: symbol, dirty: boolean) => void) | null>(
  null,
);

/**
 * Tells the drawer holding a form whether the form holds an entry not saved yet:
 * the drawer then stays open on a click beside it, which would drop the entry, as
 * when its `closeOnOutsideClick` is false. A form gone holds nothing any more.
 */
export function useReportDirty(dirty: boolean) {
  const report = useContext(DirtyFormsContext);
  const form = useRef(Symbol("form"));
  useEffect(() => {
    report?.(form.current, dirty);
  }, [report, dirty]);
  useEffect(() => {
    const key = form.current;
    return () => {
      report?.(key, false);
    };
  }, [report]);
}
