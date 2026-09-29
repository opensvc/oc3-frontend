import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { setCredentials, useCredentials } from "@/lib/api/auth";
import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2";

/** The shortest password the collector accepts, as at user creation. */
const MIN_LENGTH = 8;

type Field = "current" | "next" | "confirm";

/**
 * Change of the signed-in user's password, who gives the current one. The checks
 * the server makes are made here first, field by field; the current password can
 * only be checked by the server. Once changed, the session carries on with the new
 * password: HTTP Basic sends it with every request.
 */
export function PasswordSection({ email }: { email: string | undefined }) {
  const { t } = useTranslation();
  const credentials = useCredentials();
  const id = useId();
  const [values, setValues] = useState<Record<Field, string>>({
    current: "",
    next: "",
    confirm: "",
  });
  const [touched, setTouched] = useState(false);

  const change = useMutation({
    mutationFn: async ({ current, next }: { current: string; next: string }) => {
      const { error, response } = await api.POST("/users/self/password", {
        body: { current_password: current, new_password: next },
      });
      if (error !== undefined) {
        throw new Error(
          response.status === 403 ? t("profile.password.wrongCurrent") : problemText(error),
        );
      }
      return next;
    },
    onSuccess: (next) => {
      if (credentials !== null) setCredentials({ ...credentials, password: next });
      setValues({ current: "", next: "", confirm: "" });
      setTouched(false);
    },
  });

  const problems: Partial<Record<Field, string>> = {};
  if (values.current === "") problems.current = t("profile.password.required");
  if (values.next.length < MIN_LENGTH)
    problems.next = t("profile.password.tooShort", { count: MIN_LENGTH });
  else if (values.next === values.current) problems.next = t("profile.password.same");
  if (values.confirm !== values.next) problems.confirm = t("profile.password.mismatch");
  const valid = Object.keys(problems).length === 0;

  const field = (name: Field, autoComplete: string) => {
    const problem = touched ? problems[name] : undefined;
    return (
      <div>
        <label htmlFor={`${id}-${name}`} className="mb-1 block font-medium">
          {t(`profile.password.fields.${name}`)}
        </label>
        <input
          id={`${id}-${name}`}
          type="password"
          autoComplete={autoComplete}
          value={values[name]}
          aria-invalid={problem !== undefined}
          aria-describedby={problem === undefined ? undefined : `${id}-${name}-problem`}
          onChange={(event) => {
            setValues({ ...values, [name]: event.target.value });
            change.reset();
          }}
          className={`${INPUT} ${problem === undefined ? "" : "border-state-down"}`}
        />
        {problem !== undefined && (
          <p id={`${id}-${name}-problem`} className="mt-1 text-state-down">
            ■ {problem}
          </p>
        )}
      </div>
    );
  };

  return (
    <section className="mt-6">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink-muted">
        <ColumnFamilyIcon family="security" />
        {t("profile.password.title")}
      </h2>
      <p className="mb-2 text-ink-muted">{t("profile.password.hint", { count: MIN_LENGTH })}</p>
      <form
        className="grid max-w-sm gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (valid) change.mutate({ current: values.current, next: values.next });
        }}
      >
        {/* The account name, for password managers to file the new password under it. */}
        <input type="text" autoComplete="username" value={email ?? ""} readOnly hidden />
        {field("current", "current-password")}
        {field("next", "new-password")}
        {field("confirm", "new-password")}
        <div>
          <button
            type="submit"
            disabled={change.isPending}
            className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
          >
            {change.isPending ? t("profile.password.pending") : t("profile.password.submit")}
          </button>
        </div>
        {change.isError && (
          <p role="alert" className="text-state-down">
            ■ {change.error.message}
          </p>
        )}
        {change.isSuccess && (
          <p role="status" className="text-state-up">
            ● {t("profile.password.done")}
          </p>
        )}
      </form>
    </section>
  );
}
