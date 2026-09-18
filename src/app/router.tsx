import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { AppShell } from "./layout/AppShell";
import { AppsPage } from "@/features/apps/AppsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DisksPage } from "@/features/disks/DisksPage";
import { FiltersPage } from "@/features/filters/FiltersPage";
import { FiltersetsPage } from "@/features/filtersets/FiltersetsPage";
import { GroupsPage } from "@/features/groups/GroupsPage";
import { InstancesPage } from "@/features/instances/InstancesPage";
import { LogsPage } from "@/features/logs/LogsPage";
import { NetworksPage } from "@/features/networks/NetworksPage";
import { NodesPage } from "@/features/nodes/NodesPage";
import { ObsolescencePage } from "@/features/obsolescence/ObsolescencePage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { ServicesPage } from "@/features/services/ServicesPage";
import { TagsPage } from "@/features/tags/TagsPage";
import { UsersPage } from "@/features/users/UsersPage";
import { parseListSearch } from "@/lib/list-search";

// Routage déclaré en code pour le bootstrap. Passage au routage par fichiers
// (plugin @tanstack/router-plugin) à décider quand le nombre de vues grossira.
const rootRoute = createRootRoute({ component: AppShell });

// Le dashboard est la page d'accueil : c'est la vue d'entrée du collector,
// celle qui dit ce qui va mal avant qu'on aille chercher un objet précis.
// Tri, pagination, filterset, colonnes et ligne sélectionnée vivent dans l'URL.
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
  validateSearch: parseListSearch,
});

// Les liens vers l'ancienne adresse du dashboard continuent de fonctionner,
// avec leur état d'URL.
const dashboardRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  validateSearch: parseListSearch,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search });
  },
});

const nodesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nodes",
  component: NodesPage,
  validateSearch: parseListSearch,
});

const appsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/apps",
  component: AppsPage,
  validateSearch: parseListSearch,
});

const networksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/networks",
  component: NetworksPage,
  validateSearch: parseListSearch,
});

const disksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/disks",
  component: DisksPage,
  validateSearch: parseListSearch,
});

const groupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups",
  component: GroupsPage,
  validateSearch: parseListSearch,
});

const servicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/services",
  component: ServicesPage,
  validateSearch: parseListSearch,
});

const instancesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/instances",
  component: InstancesPage,
  validateSearch: parseListSearch,
});

const tagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tags",
  component: TagsPage,
  validateSearch: parseListSearch,
});

const obsolescenceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/obsolescence",
  component: ObsolescencePage,
  validateSearch: parseListSearch,
});

const logsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logs",
  component: LogsPage,
  validateSearch: parseListSearch,
});

const filtersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/filters",
  component: FiltersPage,
  validateSearch: parseListSearch,
});

const filtersetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/filtersets",
  component: FiltersetsPage,
  validateSearch: parseListSearch,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  component: UsersPage,
  validateSearch: parseListSearch,
});

// Profil de l'utilisateur connecté : pas d'état de liste, donc pas de recherche.
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  dashboardRedirectRoute,
  nodesRoute,
  servicesRoute,
  instancesRoute,
  networksRoute,
  disksRoute,
  groupsRoute,
  tagsRoute,
  appsRoute,
  usersRoute,
  obsolescenceRoute,
  logsRoute,
  filtersRoute,
  filtersetsRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
