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
        {/* L'icône garde sa teinte dans tous les états : elle identifie la vue,
            c'est le fond et le libellé qui marquent la sélection. */}
        <ObjectIcon kind={entry.icon} />
        {t(entry.labelKey)}
      </Link>
    </li>
  );
}

/**
 * Menu latéral. Repliable : sur un écran étroit, ou quand une table large a besoin
 * de toute la place. Replié, il garde sa place dans la grille mais plus sa largeur,
 * et `inert` le retire du parcours clavier.
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
