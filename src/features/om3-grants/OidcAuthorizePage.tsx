import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { answerSignInRequest, useSignInRequest } from "./om3-grants-api";

/** The host and port a redirection URI sends the browser back to, as shown to the user. */
function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}

/**
 * Where an om3 cluster sends its users to sign in with the collector: the
 * collector's provider handed the request here, the user being signed in (the
 * shell showed the sign-in screen otherwise). The request is approved at once,
 * the clusters being the organization's own, unless the cluster asked for a
 * consent or the user holds no om3 grant on it; the browser then goes back to
 * the cluster with the code, or with the refusal.
 */
export function OidcAuthorizePage() {
  const { t } = useTranslation();
  const { request: requestId } = useSearch({ from: "/oidc/authorize" });
  const request = useSignInRequest(requestId ?? "");
  const [leaving, setLeaving] = useState(false);
  const answer = useMutation({
    mutationFn: (approve: boolean) => answerSignInRequest(requestId ?? "", approve),
    onSuccess: (to) => {
      setLeaving(true);
      window.location.assign(to);
    },
  });

  // Approve once, without a click, when nothing calls for the user's decision.
  const autoApproved = useRef(false);
  const data = request.data;
  const asksConsent = data?.prompt.split(" ").includes("consent") ?? false;
  const canApprove = data !== undefined && data.grants.length > 0;
  useEffect(() => {
    if (autoApproved.current || !canApprove || asksConsent) return;
    autoApproved.current = true;
    answer.mutate(true);
  }, [canApprove, asksConsent, answer]);

  if (requestId === undefined) {
    return (
      <Card>
        <p role="alert" className="text-state-down">
          ■ {t("oidcAuthorize.noRequest")}
        </p>
      </Card>
    );
  }
  if (request.isPending) {
    return (
      <Card>
        <p className="text-ink-muted">{t("list.loading")}</p>
      </Card>
    );
  }
  if (request.isError) {
    return (
      <Card>
        <p role="alert" className="text-state-down">
          ■ {request.error.message}
        </p>
      </Card>
    );
  }

  const r = request.data;
  const busy = answer.isPending || leaving;
  return (
    <Card>
      <h1 className="mb-3 flex items-center gap-2 text-title font-semibold">
        <ObjectIcon kind="cluster" className="h-5 w-5" />
        {t("oidcAuthorize.title", { cluster: r.cluster_name })}
      </h1>
      <dl className="mb-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt className="text-ink-muted">{t("oidcAuthorize.user")}</dt>
        <dd>{r.user}</dd>
        <dt className="text-ink-muted">{t("oidcAuthorize.cluster")}</dt>
        <dd>
          {r.cluster_name} <span className="font-mono text-ink-muted">{r.client_id}</span>
        </dd>
        <dt className="text-ink-muted">{t("oidcAuthorize.returnTo")}</dt>
        <dd className="font-mono break-all">{hostOf(r.redirect_uri)}</dd>
        <dt className="text-ink-muted">{t("oidcAuthorize.grants")}</dt>
        <dd className="font-mono">
          {r.grants.length > 0 ? (
            r.grants.join(" ")
          ) : (
            <span className="font-sans text-state-warn">
              <span aria-hidden="true">▲</span> {t("oidcAuthorize.noGrant")}
            </span>
          )}
        </dd>
      </dl>
      {answer.isError && (
        <p role="alert" className="mb-3 text-state-down">
          ■ {answer.error.message}
        </p>
      )}
      {busy && !answer.isError ? (
        <p role="status" className="text-ink-muted">
          {t("oidcAuthorize.redirecting", { cluster: r.cluster_name })}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {canApprove && (
            <button
              type="button"
              onClick={() => {
                answer.mutate(true);
              }}
              className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink"
            >
              {t("oidcAuthorize.approve")}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              answer.mutate(false);
            }}
            className="h-8 rounded-(--radius-control) border border-line px-3"
          >
            {canApprove ? t("oidcAuthorize.deny") : t("oidcAuthorize.back")}
          </button>
        </div>
      )}
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto mt-8 max-w-xl rounded-(--radius-panel) border border-line bg-surface-raised p-5">
      {children}
    </section>
  );
}
