import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/Combobox";
import { CloseIcon, FilterIcon } from "@/components/ui/icons";
import { useFiltersets } from "@/lib/api/filtersets";
import { useImpersonation } from "@/lib/api/impersonation";
import {
  refreshFilteredData,
  useSessionFilterset,
  useSetSessionFilterset,
} from "@/lib/api/session-filterset";

/** Value of the "no filterset" choice, apart from the filterset names. */
const NONE = "\u0000none";

/**
 * The session filter of the top bar, the filterset selector of the historical
 * collector: the chosen filterset narrows every list to its nodes and services,
 * server side, until another is chosen or "None". The choice is kept with the
 * account. While active, the control is a tinted chip with an accent border, its
 * label a solid accent tag, the choice in bold and a button removing it, so that a short list is not
 * taken for the whole fleet. While acting as another user, that user's filterset
 * is shown and cannot be changed.
 */
export function SessionFilter() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const current = useSessionFilterset();
  const filtersets = useFiltersets();
  const choose = useSetSessionFilterset();
  const impersonating = useImpersonation() !== null;
  const name = current.data?.fset_name ?? null;

  // Changed elsewhere (another tab, the live updates): the views follow.
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!current.isSuccess) return;
    if (seen.current !== undefined && seen.current !== name) void refreshFilteredData(queryClient);
    seen.current = name;
  }, [current.isSuccess, name, queryClient]);

  const options = [
    { value: NONE, label: t("header.noFilter") },
    ...(filtersets.data ?? []).map((fset) => ({ value: fset, label: fset })),
  ];
  const active = name !== null;

  return (
    <div
      // Active, the whole control is a tinted chip, with its border and a removal
      // button: a narrowed fleet must not pass for the whole one. The border and the
      // button's room are kept when inactive, so that the top bar does not shift.
      className={`flex items-center gap-1.5 rounded-(--radius-control) border p-0.5 ${
        active ? "border-accent bg-accent-soft" : "border-transparent"
      }`}
    >
      {/* Active, the label is a solid tag: the strongest mark of the bar. Same weight
          in both states: a bolder label would widen and shift the bar. */}
      <span
        className={`flex items-center gap-1 rounded-(--radius-control) px-1.5 py-0.5 text-data ${
          active ? "bg-accent text-accent-ink" : "text-ink-muted"
        }`}
      >
        <FilterIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        {t("header.sessionFilter")}
      </span>
      {impersonating ? (
        <span title={t("header.sessionFilterImpersonating")} className="text-data">
          {name ?? t("header.noFilter")}
        </span>
      ) : (
        <Combobox
          options={options}
          value={name ?? NONE}
          onChange={(value) => {
            // "" is typing in the field, not a choice.
            if (value === "" || value === (name ?? NONE)) return;
            choose.mutate(value === NONE ? null : value);
          }}
          label={t("header.sessionFilter")}
          emptyText={t("header.sessionFilterNoMatch")}
          className="w-44 text-data"
          accent={active}
        />
      )}
      <button
        type="button"
        onClick={() => {
          choose.mutate(null);
        }}
        disabled={!active || impersonating}
        aria-hidden={!active || impersonating}
        tabIndex={active && !impersonating ? 0 : -1}
        title={t("header.sessionFilterClear")}
        aria-label={t("header.sessionFilterClear")}
        className={`flex h-6 w-6 items-center justify-center rounded-(--radius-control) text-ink-muted hover:bg-surface hover:text-ink ${
          active && !impersonating ? "" : "invisible"
        }`}
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
      {choose.isError && (
        <span role="alert" className="text-data text-state-down" title={choose.error.message}>
          ■ {t("header.sessionFilterFailed")}
        </span>
      )}
    </div>
  );
}
