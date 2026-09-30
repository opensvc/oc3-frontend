import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { basicHeader, setCredentials } from "@/lib/api/auth";
import { problemText } from "@/lib/api/problem";
import opensvcLogo from "@/assets/opensvc-logo.svg";

/**
 * Temporary sign-in screen, while waiting for OIDC.
 *
 * The credentials are checked on `GET /users/self` with their own header, and only
 * kept once accepted: kept first, the whole interface would render at once, its
 * requests would be refused, and the sign-out that follows would remount this form
 * empty, the reason of the failure lost. When OIDC arrives, this component and the
 * credentials store disappear together.
 */
export function SignIn() {
  const { t } = useTranslation();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  // Why the sign-in failed: the credentials refused (401), or the collector unable
  // to check them — a database down answers 503 — with the server's message.
  const [failure, setFailure] = useState<{ rejected: true } | { unavailable: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFailure(null);
    try {
      const { error, response } = await api.GET("/users/{user_id}", {
        params: { path: { user_id: "self" }, query: { props: "id" } },
        headers: { Authorization: basicHeader({ user, password }) },
      });
      if (error === undefined) {
        setCredentials({ user, password });
        return;
      }
      setFailure(
        response.status === 401 ? { rejected: true } : { unavailable: problemText(error) },
      );
    } catch (caught) {
      // The collector did not answer at all.
      setFailure({ unavailable: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-sm">
      {/* Same mark as the top bar, which the sign-in screen replaces. */}
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

        {failure !== null && (
          <p role="alert" className="mb-3 text-state-down">
            ■{" "}
            {"rejected" in failure
              ? t("auth.rejected")
              : t("auth.unavailable", { reason: failure.unavailable })}
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
