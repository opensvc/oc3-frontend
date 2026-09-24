import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailContent } from "@/components/opensvc/DetailPanel";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { problemText } from "@/lib/api/problem";
import { USER_GROUPS, USER_PROPS_QUERY } from "@/features/users/user-fields";
import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import {
  hasSavedViewPrefs,
  usePalettePref,
  useResetViewPrefs,
  useThemePref,
  useUserPrefs,
} from "@/lib/user-prefs";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { ResetIcon } from "@/components/ui/icons";
import { PALETTES, THEMES } from "@/lib/theme";

type UserRow = components["schemas"]["UserRow"];

/**
 * Profile of the signed-in user, opened from their name in the top bar.
 *
 * `GET /users/self` names the caller server side: no need to know their id, and the
 * page stays right if the sign-in email changes case. The historical collector also
 * showed the groups, the application codes and the default filterset; the API does
 * not expose them per user yet, see notes.md.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const theme = useThemePref();
  const palette = usePalettePref();
  const prefs = useUserPrefs();
  const resetViews = useResetViewPrefs();
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
          {t("profile.palette.title")}
        </h2>
        <p className="mb-2 text-ink-muted">{t("profile.palette.hint")}</p>
        <ChoiceGroup
          name="palette"
          label={t("profile.palette.title")}
          options={PALETTES}
          optionLabel={(value) => t(`profile.palette.options.${value}`)}
          choice={palette}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink-muted">
          <ColumnFamilyIcon family="env" />
          {t("profile.theme.title")}
        </h2>
        <p className="mb-2 text-ink-muted">{t("profile.theme.hint")}</p>
        <ChoiceGroup
          name="theme"
          label={t("profile.theme.title")}
          options={THEMES}
          optionLabel={(value) => t(`profile.theme.options.${value}`)}
          choice={theme}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink-muted">
          <ColumnFamilyIcon family="team" />
          {t("profile.viewPrefs.title")}
        </h2>
        <p className="mb-2 text-ink-muted">{t("profile.viewPrefs.hint")}</p>
        {hasSavedViewPrefs(prefs.data) ? (
          <ConfirmButton
            icon={<ResetIcon />}
            label={t("profile.viewPrefs.reset")}
            question={t("profile.viewPrefs.question")}
            confirmLabel={t("profile.viewPrefs.confirm")}
            cancelLabel={t("detail.cancel")}
            pendingLabel={t("profile.viewPrefs.pending")}
            pending={resetViews.isPending}
            onConfirm={resetViews.reset}
          />
        ) : (
          <p role="status" className="text-ink-muted">
            {resetViews.isDone ? t("profile.viewPrefs.done") : t("profile.viewPrefs.none")}
          </p>
        )}
        {resetViews.errorMessage !== null && (
          <p role="alert" className="mt-2 text-state-down">
            ■ {resetViews.errorMessage}
          </p>
        )}
      </section>
    </section>
  );
}

/** Radio group of an appearance choice, saved as soon as it changes. */
function ChoiceGroup<V extends string>({
  name,
  label,
  options,
  optionLabel,
  choice,
}: {
  name: string;
  label: string;
  options: readonly V[];
  optionLabel: (value: V) => string;
  choice: { value: V; set: (value: V) => void; isSaving: boolean; errorMessage: string | null };
}) {
  return (
    <>
      <div role="radiogroup" aria-label={label} className="flex gap-2">
        {options.map((value) => (
          <label
            key={value}
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-(--radius-control) border border-line px-3 has-checked:border-accent has-checked:bg-accent-soft has-checked:text-ink"
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={choice.value === value}
              disabled={choice.isSaving}
              onChange={() => {
                choice.set(value);
              }}
            />
            {optionLabel(value)}
          </label>
        ))}
      </div>
      {choice.errorMessage !== null && (
        <p role="alert" className="mt-2 text-state-down">
          ■ {choice.errorMessage}
        </p>
      )}
    </>
  );
}
