import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { setCredentials } from "@/lib/api/auth";
import opensvcLogo from "@/assets/opensvc-logo.svg";

/**
 * Écran de connexion provisoire, en attendant OIDC.
 *
 * apicollector n'expose pas d'endpoint d'identité : pour vérifier des identifiants,
 * on appelle un endpoint protégé et on regarde s'il répond. Quand OIDC arrivera,
 * ce composant et le magasin d'identifiants disparaissent ensemble.
 */
export function SignIn() {
  const { t } = useTranslation();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [rejected, setRejected] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setRejected(false);
    setCredentials({ user, password });
    const { error } = await api.GET("/nodes", { params: { query: { limit: 1 } } });
    if (error !== undefined) {
      setCredentials(null);
      setRejected(true);
    }
    setPending(false);
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-sm">
      {/* Même marque que la barre du haut, que l'écran de connexion remplace. */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src={opensvcLogo} alt="" width={56} height={56} className="h-14 w-14" />
        <p className="text-title font-semibold tracking-tight">OpenSVC Collector</p>
      </div>

      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        className="rounded-(--radius-panel) border border-line bg-surface-raised p-4"
      >
        <h1 className="mb-1 text-title font-semibold">{t("auth.title")}</h1>
        <p className="mb-4 text-ink-muted">{t("auth.intro")}</p>

        <label className="mb-1 block font-medium" htmlFor="signin-user">
          {t("auth.user")}
        </label>
        <input
          id="signin-user"
          name="username"
          autoComplete="username"
          required
          value={user}
          onChange={(event) => {
            setUser(event.target.value);
          }}
          className="mb-3 h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2"
        />

        <label className="mb-1 block font-medium" htmlFor="signin-password">
          {t("auth.password")}
        </label>
        <input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          className="mb-3 h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2"
        />

        {rejected && (
          <p role="alert" className="mb-3 text-state-down">
            ■ {t("auth.rejected")}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-8 w-full rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {pending ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>
    </div>
  );
}
