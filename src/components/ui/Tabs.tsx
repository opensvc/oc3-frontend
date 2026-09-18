import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Petit compteur après le libellé, par exemple le nombre de lignes de l'onglet. */
  badge?: ReactNode;
}

/**
 * Barre d'onglets au motif ARIA « tabs » : un seul onglet dans le parcours Tab,
 * les flèches, Début et Fin passent d'un onglet à l'autre et l'activent.
 *
 * Elle défile horizontalement quand les onglets ne tiennent plus : leur nombre peut
 * croître sans casser la mise en page.
 */
export function TabList({
  tabs,
  active,
  onChange,
  label,
  idPrefix,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  /** Nom accessible de la barre d'onglets. */
  label: string;
  /** Préfixe des identifiants, partagé avec `tabPanelProps`. */
  idPrefix: string;
}) {
  const list = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.key === active);
    const target =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    const next = tabs[target];
    if (next === undefined) return;
    event.preventDefault();
    onChange(next.key);
    list.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(`${idPrefix}-tab-${next.key}`)}`)
      ?.focus();
  }

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      // Le trait du bas est une ombre intérieure et non une bordure : le soulignement de
      // l'onglet actif le recouvre sans déborder d'un pixel, ce qui faisait apparaître une
      // barre de défilement verticale. Seul le défilement horizontal reste permis.
      className="flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden px-3 shadow-[inset_0_-1px_0_var(--color-line)]"
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            id={`${idPrefix}-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onChange(tab.key);
            }}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-2 whitespace-nowrap ${
              selected
                ? "border-accent font-medium text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
