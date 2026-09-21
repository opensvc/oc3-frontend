import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailContent } from "@/components/opensvc/DetailPanel";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { problemText } from "@/lib/api/problem";
import { USER_GROUPS, USER_PROPS_QUERY } from "@/features/users/user-fields";
import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import { useThemePref } from "@/lib/user-prefs";
import { THEMES } from "@/lib/theme";

type UserRow = components["schemas"]["UserRow"];

/**
 * Profil de l'utilisateur connecté, ouvert depuis son nom dans la barre du haut.
 *
 * `GET /users/self` désigne l'appelant côté serveur : pas besoin de connaître son
 * identifiant, et la page reste juste si l'e-mail de connexion change de casse.
 * Le collector historique montrait aussi les groupes, les codes application et le
 * filterset par défaut ; l'API ne les expose pas encore par utilisateur, voir notes.md.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const theme = useThemePref();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["user", "self"],
    queryFn: async () => {
      const { data, error: failure } = await api.GET("/users/{user_id}", {
        params: { path: { user_id: "self" }, query: { props: USER_PROPS_QUERY } },
      });
      if (failure !== undefined) throw new Error(problemText(failure));
      const rows: UserRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });

  const fullName = [data?.first_name, data?.last_name]
    .filter((part) => part !== undefined && part !== "")
    .join(" ");

  return (
    <section className="max-w-2xl">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="user" className="h-5 w-5" />
          {t("profile.title")}
        </h1>
        {data !== undefined && data !== null && (
          <p className="mt-1 text-ink-muted">
            {fullName === "" ? data.email : `${fullName} · ${data.email ?? ""}`}
          </p>
        )}
      </div>

      <DetailContent
        groups={USER_GROUPS}
        row={data}
        labelPrefix="users.fields"
        groupPrefix="users.detail.groups"
        isPending={isPending}
        errorMessage={isError ? error.message : null}
      />

      <section className="mt-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink-muted">
          <ColumnFamilyIcon family="env" />
          {t("profile.theme.title")}
        </h2>
        <p className="mb-2 text-ink-muted">{t("profile.theme.hint")}</p>
        <div role="radiogroup" aria-label={t("profile.theme.title")} className="flex gap-2">
          {THEMES.map((value) => (
            <label
              key={value}
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-(--radius-control) border border-line px-3 has-checked:border-accent has-checked:bg-accent-soft has-checked:text-ink"
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme.theme === value}
                disabled={theme.isSaving}
                onChange={() => {
                  theme.setTheme(value);
                }}
              />
              {t(`profile.theme.options.${value}`)}
            </label>
          ))}
        </div>
        {theme.errorMessage !== null && (
          <p role="alert" className="mt-2 text-state-down">
            ■ {theme.errorMessage}
          </p>
        )}
      </section>
    </section>
  );
}
