import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { CaretRightIcon } from "@/components/ui/icons";
import type { KeyboardEvent } from "react";
import { useNavCollapsedPref } from "@/lib/user-prefs";
import { NAV_CATEGORIES, NAV_TOP, type NavEntry } from "./navigation";

const LINK =
  "flex items-center gap-2 rounded-(--radius-control) px-2 py-1 text-ink-muted hover:text-ink";
const LINK_ACTIVE = { className: "bg-accent-soft text-ink" };

function NavLink({ entry }: { entry: NavEntry }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to={entry.to}
        activeOptions={entry.exact === true ? { exact: true } : undefined}
        className={LINK}
        activeProps={LINK_ACTIVE}
      >
        {/* The icon keeps its tint in every state: it identifies the view, and the
            background and the label are what mark the selection. */}
        <ObjectIcon kind={entry.icon} />
        {t(entry.labelKey)}
      </Link>
    </li>
  );
}

/**
 * Side menu. Foldable: on a narrow screen, or when a wide table needs all the room.
 * Folded, it keeps its place in the grid but not its width, and `inert` takes it out
 * of the keyboard path. Each section folds too, and the account keeps which ones
 * are folded; all are open by default.
 *
 * From the keyboard, "n" brings the focus here (`AppShell`); the arrows then move
 * from one entry or section title to the next, Home and End go to the ends, and
 * Escape gives the focus back to the page.
 */
export function Sidebar({ open }: { open: boolean }) {
  const { t } = useTranslation();
  const sections = useNavCollapsedPref();

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      return;
    }
    // The entries of a folded section are hidden: they are not stops.
    const stops = [...event.currentTarget.querySelectorAll<HTMLElement>("a, button")].filter(
      (element) => element.closest("[hidden]") === null,
    );
    const at = stops.findIndex((element) => element === document.activeElement);
    const next =
      event.key === "ArrowDown"
        ? stops[Math.min(at + 1, stops.length - 1)]
        : event.key === "ArrowUp"
          ? stops[Math.max(at - 1, 0)]
          : event.key === "Home"
            ? stops[0]
            : event.key === "End"
              ? stops[stops.length - 1]
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    next.focus();
  }

  return (
    <aside
      id="app-sidebar"
      inert={!open}
      className={`overflow-hidden border-r border-line bg-surface-raised transition-[width] duration-200 ease-out ${
        open ? "w-52" : "w-0 border-r-0"
      }`}
    >
      <nav
        aria-label={t("nav.main")}
        aria-keyshortcuts="n"
        onKeyDown={onKeyDown}
        className="w-52 p-2"
      >
        <ul>
          {NAV_TOP.map((entry) => (
            <NavLink key={entry.to} entry={entry} />
          ))}
        </ul>

        {NAV_CATEGORIES.map((category) => {
          const expanded = !sections.isCollapsed(category.key);
          return (
            <section key={category.key} className="mt-3">
              <h2 className="text-data font-semibold text-ink-muted uppercase">
                <button
                  type="button"
                  id={`nav-category-${category.key}`}
                  aria-expanded={expanded}
                  aria-controls={`nav-entries-${category.key}`}
                  onClick={() => {
                    sections.toggle(category.key);
                  }}
                  className="flex w-full items-center gap-1 rounded-(--radius-control) px-2 py-1 text-left uppercase hover:text-ink"
                >
                  <CaretRightIcon
                    className={`h-2.5 w-2.5 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                  {t(category.labelKey)}
                </button>
              </h2>
              <ul
                id={`nav-entries-${category.key}`}
                aria-labelledby={`nav-category-${category.key}`}
                hidden={!expanded}
              >
                {category.entries.map((entry) => (
                  <NavLink key={entry.to} entry={entry} />
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
