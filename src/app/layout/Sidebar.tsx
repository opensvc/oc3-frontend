import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
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
 * of the keyboard path.
 */
export function Sidebar({ open }: { open: boolean }) {
  const { t } = useTranslation();

  return (
    <aside
      id="app-sidebar"
      inert={!open}
      className={`overflow-hidden border-r border-line bg-surface-raised transition-[width] duration-200 ease-out ${
        open ? "w-52" : "w-0 border-r-0"
      }`}
    >
      <nav aria-label={t("nav.main")} className="w-52 p-2">
        <ul>
          {NAV_TOP.map((entry) => (
            <NavLink key={entry.to} entry={entry} />
          ))}
        </ul>

        {NAV_CATEGORIES.map((category) => (
          <section key={category.key} className="mt-3">
            <h2
              id={`nav-category-${category.key}`}
              className="px-2 py-1 text-data font-semibold text-ink-muted uppercase"
            >
              {t(category.labelKey)}
            </h2>
            <ul aria-labelledby={`nav-category-${category.key}`}>
              {category.entries.map((entry) => (
                <NavLink key={entry.to} entry={entry} />
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}
