import { useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCredentials } from "@/lib/api/auth";
import { SignIn } from "@/features/auth/SignIn";
import opensvcLogo from "@/assets/opensvc-logo.svg";
import { Sidebar } from "./Sidebar";
import { ActionQueueLink } from "@/features/actions/ActionQueueLink";
import { UserMenu } from "./UserMenu";

const SIDEBAR_KEY = "oc3.sidebar";

/** Le repli du menu est un confort d'affichage, propre au navigateur : il ne va pas dans l'URL. */
function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== "closed";
  } catch {
    // Navigation privée ou stockage refusé : le menu s'ouvre, comme par défaut.
    return true;
  }
}

/**
 * Coquille applicative. Reprend les zones fonctionnelles du collector : navigation
 * en menu latéral, filtre de session, file d'actions, recherche globale.
 * Les trois derniers sont des emplacements : ils sont implémentés en phases 3 et 4.
 */
export function AppShell() {
  const { t } = useTranslation();
  const credentials = useCredentials();
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);

  function toggleSidebar() {
    setSidebarOpen((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "open" : "closed");
      } catch {
        // Préférence non mémorisée : sans conséquence pour la session en cours.
      }
      return next;
    });
  }

  // Tant que personne n'est connecté, aucune vue n'a de données à montrer :
  // on affiche l'écran de connexion à la place, sans les outils de l'interface.
  if (credentials === null) {
    return (
      <div className="min-h-dvh bg-surface px-4 text-ink">
        <SignIn />
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-surface text-ink">
      <header className="flex h-11 items-center gap-4 border-b border-line bg-surface-raised px-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          className="rounded-(--radius-control) border border-line px-2 py-1 text-ink-muted hover:text-ink"
        >
          <span aria-hidden="true">☰</span>
          <span className="sr-only">{sidebarOpen ? t("nav.hideMenu") : t("nav.showMenu")}</span>
        </button>

        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          {/* Décoratif : le titre qui suit nomme déjà le lien. */}
          <img src={opensvcLogo} alt="" width={24} height={24} className="h-6 w-6" />
          OpenSVC Collector
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="rounded-(--radius-control) border border-line px-2 py-1 text-ink-muted"
            title={t("header.sessionFilter")}
          >
            {t("header.sessionFilter")}: {t("header.noFilter")}
          </button>
          <ActionQueueLink />
          <input
            type="search"
            placeholder={t("header.search")}
            aria-label={t("header.search")}
            className="h-7 w-64 rounded-(--radius-control) border border-line bg-surface px-2 placeholder:text-ink-muted"
          />
          <UserMenu user={credentials.user} />
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[auto_1fr]">
        <Sidebar open={sidebarOpen} />
        <main className="min-w-0 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
