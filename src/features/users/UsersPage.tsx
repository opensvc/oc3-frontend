import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { CollectorList, type ListColumn } from "@/components/opensvc/CollectorList";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import type { ColumnFamily } from "@/components/opensvc/ColumnFamily";
import {
  resolveListSearch,
  resetsScroll,
  toSearchParams,
  visibleProps,
  type ResolvedListSearch,
} from "@/lib/list-search";
import { useViewPrefs, withSavedSearch } from "@/lib/user-prefs";
import { CreateUserPanel } from "./CreateUserPanel";
import { UserDetailPanel } from "./UserDetailPanel";

type UserRow = components["schemas"]["UserRow"];

const DEFAULT_SORT = ["email"];

/**
 * Propriétés d'utilisateur exposées par apicollector, dans l'ordre de son
 * `meta.available_props`, à deux exceptions près : `registration_id` et
 * `reset_password_key` ne sont pas proposés. La clé de réinitialisation suffit à
 * changer le mot de passe d'un compte ; elle n'a rien à faire dans une liste, et
 * qu'apicollector la renvoie est signalé dans notes.md.
 */
const USER_PROPS = [
  "id",
  "username",
  "email",
  "first_name",
  "last_name",
  "phone_work",
  "im_type",
  "im_username",
  "email_notifications",
  "im_notifications",
  "email_log_level",
  "im_log_level",
  "email_notifications_delay",
  "im_notifications_delay",
  "lock_filter",
  "quota_app",
  "quota_org_group",
  "quota_docker_registries",
] as const satisfies readonly (keyof UserRow)[];

/** Colonnes par défaut : de quoi reconnaître quelqu'un et le joindre. */
const DEFAULT_COLS: string[] = ["email", "first_name", "last_name", "phone_work"];

/**
 * Colonnes chiffrées, alignées à droite. apicollector renvoie délais et quotas en
 * chaînes (helper `colStr`), mais ce sont des nombres à l'écran.
 */
const NUMERIC_PROPS = new Set<string>([
  "id",
  "email_notifications_delay",
  "im_notifications_delay",
  "quota_app",
  "quota_org_group",
  "quota_docker_registries",
]);

const FAMILY: Record<string, ColumnFamily> = {
  id: "team",
  username: "team",
  email: "team",
  first_name: "team",
  last_name: "team",
  phone_work: "team",
  im_type: "team",
  im_username: "team",
  email_notifications: "alert",
  im_notifications: "alert",
  email_log_level: "alert",
  im_log_level: "alert",
  email_notifications_delay: "alert",
  im_notifications_delay: "alert",
  lock_filter: "security",
  quota_app: "app",
  quota_org_group: "team",
  quota_docker_registries: "service",
};

const COLUMNS: ListColumn<UserRow>[] = USER_PROPS.map((prop) => ({
  prop,
  labelKey: `users.fields.${prop}`,
  numeric: NUMERIC_PROPS.has(prop),
  family: FAMILY[prop] ?? "team",
  render: (row: UserRow) => row[prop],
}));

const ALL_PROPS = COLUMNS.map((column) => column.prop);

/** Ne demander que les colonnes affichées, plus l'identifiant qui sert au détail. */
function queryProps(cols: string[] | undefined): string {
  return [...new Set(["id", ...visibleProps(cols, DEFAULT_COLS, ALL_PROPS)])].join(",");
}

/**
 * La liste est filtrée côté serveur selon l'appelant : un Manager ou un UserManager
 * voit tout le monde, les autres ne voient qu'eux-mêmes et les membres de leurs
 * groupes d'organisation.
 */
function useUsers(search: ResolvedListSearch) {
  return useQuery({
    queryKey: ["users", search.sort, search.offset, search.limit, search.cols],
    queryFn: async () => {
      // Une ligne de plus que la page : apicollector ne renvoie pas le total d'une sélection.
      const { data, error } = await api.GET("/users", {
        params: {
          query: {
            props: queryProps(search.cols),
            orderby: search.sort.join(","),
            offset: search.offset,
            limit: search.limit + 1,
          },
        },
      });
      if (error !== undefined) throw new Error(JSON.stringify(error));
      const all: UserRow[] = Array.isArray(data.data) ? data.data : [];
      return { rows: all.slice(0, search.limit), hasMore: all.length > search.limit };
    },
  });
}

export function UsersPage() {
  const { t } = useTranslation();
  const prefs = useViewPrefs("users");
  const search = resolveListSearch(
    withSavedSearch(useSearch({ from: "/users" }), prefs),
    DEFAULT_SORT,
  );
  const navigate = useNavigate({ from: "/users" });
  const { data, isPending, isError, error, isFetching } = useUsers(search);

  /** Identifiants de toute la sélection, sans pagination. */
  async function allIds(): Promise<string[]> {
    const { data, error } = await api.GET("/users", {
      params: { query: { props: "id", limit: 0 } },
    });
    if (error !== undefined) throw new Error(JSON.stringify(error));
    const rows: UserRow[] = Array.isArray(data.data) ? data.data : [];
    return rows
      .map((row) => row.id)
      .filter((id): id is number => id !== undefined)
      .map(String);
  }

  function update(next: Partial<ResolvedListSearch>) {
    // Colonnes et tri suivent le compte, les autres états restent dans l'URL.
    if ("cols" in next) prefs.saveCols(next.cols);
    if ("sort" in next) prefs.saveSort(next.sort);
    void navigate({
      search: (previous) => ({ ...previous, ...toSearchParams(next) }),
      resetScroll: resetsScroll(next),
    });
  }

  const [creating, setCreating] = useState(false);
  const selected = data?.rows.find((row) => String(row.id) === search.sel);

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="user" className="h-5 w-5" />
          {t("users.title")}
        </h1>
        <button
          type="button"
          onClick={() => {
            // Les deux tiroirs partagent le bord droit : ouvrir la création ferme le détail.
            update({ sel: undefined });
            setCreating(true);
          }}
          className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink"
        >
          {t("users.create.open")}
        </button>
      </div>

      <CollectorList
        columns={COLUMNS}
        defaultCols={DEFAULT_COLS}
        rows={data?.rows ?? []}
        rowId={(row) => (row.id === undefined ? undefined : String(row.id))}
        search={search}
        onChange={update}
        // Les filtersets du collector ne portent pas sur les utilisateurs.
        filtersets={[]}
        isPending={isPending}
        isFetching={isFetching}
        errorMessage={isError ? error.message : null}
        hasMore={data?.hasMore ?? false}
        selectAllMatching={allIds}
      />

      <CreateUserPanel
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
        onCreated={(id) => {
          // Le nouvel utilisateur s'ouvre dans le détail.
          if (id !== undefined) update({ sel: String(id) });
        }}
      />

      <UserDetailPanel
        userId={creating ? undefined : search.sel}
        label={selected?.email ?? ""}
        onClose={() => {
          update({ sel: undefined });
        }}
      />
    </section>
  );
}
