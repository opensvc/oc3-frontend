import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { DateTime } from "@/components/ui/DateTime";
import { Om3GrantPanel } from "./Om3GrantPanel";
import { useOidcProviderInfo, useOm3GrantRules } from "./om3-grants-api";

/**
 * The om3 grants the collector gives the teams, as the OpenID Connect provider
 * of the om3 clusters: a user signing in to a cluster with the collector gets
 * the grants of the rules naming one of their teams and this cluster, or every
 * cluster. The selected rule lives in the URL.
 */
export function Om3GrantsPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/om3-grants" });
  const navigate = useNavigate({ from: "/om3-grants" });
  const info = useOidcProviderInfo();
  const rules = useOm3GrantRules();
  const [creating, setCreating] = useState(false);
  const selected = rules.data?.find((r) => String(r.id) === search.sel);

  function select(sel: string | undefined) {
    void navigate({ search: (previous) => ({ ...previous, sel }) });
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="cluster" className="h-5 w-5" />
          {t("om3Grants.title")}
        </h1>
        <button
          type="button"
          onClick={() => {
            select(undefined);
            setCreating(true);
          }}
          className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink"
        >
          {t("om3Grants.new")}
        </button>
      </div>
      <p className="mb-3 max-w-3xl text-ink-muted">{t("om3Grants.intro")}</p>

      {info.data !== undefined && (
        <div className="mb-4 max-w-3xl rounded-(--radius-panel) border border-line bg-surface-raised p-3">
          {info.data.enabled ? (
            <>
              <p className="mb-2">{t("om3Grants.setup")}</p>
              <pre className="overflow-x-auto rounded-(--radius-control) bg-surface-sunken p-2 font-mono text-data">
                {`om cluster config update \\\n  --set listener.openid_issuer=${info.data.issuer ?? ""} \\\n  --set listener.openid_client_id=<cluster id>`}
              </pre>
              <p className="mt-2 text-ink-muted">{t("om3Grants.setupClientId")}</p>
            </>
          ) : (
            <p className="text-state-warn">
              <span aria-hidden="true">▲</span> {t("om3Grants.disabled")}
            </p>
          )}
        </div>
      )}

      {rules.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : rules.isError ? (
        <p role="alert" className="text-state-down">
          ■ {rules.error.message}
        </p>
      ) : rules.data.length === 0 ? (
        <p className="text-ink-muted">{t("om3Grants.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-panel) border border-line bg-surface-raised">
          <table className="w-full border-collapse text-data">
            <caption className="sr-only">{t("om3Grants.title")}</caption>
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                {["team", "cluster", "grants", "updated"].map((key) => (
                  <th key={key} scope="col" className="px-3 py-1.5 font-medium whitespace-nowrap">
                    {t(`om3Grants.fields.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.data.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-line/60 align-top last:border-b-0 ${
                    selected?.id === r.id ? "bg-accent-soft" : ""
                  }`}
                >
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        select(String(r.id));
                      }}
                      className="font-medium text-accent hover:underline"
                    >
                      {r.group_role !== "" ? r.group_role : `#${String(r.group_id)}`}
                    </button>
                  </th>
                  <td className="px-3 py-1.5">
                    {r.cluster_id === "" ? (
                      <span className="text-ink-muted">{t("om3Grants.everyCluster")}</span>
                    ) : (
                      <span title={r.cluster_id}>
                        {r.cluster_name !== "" ? r.cluster_name : r.cluster_id}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-mono">{r.grants}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <DateTime value={r.updated} />
                    {r.author !== "" && <span className="block text-ink-muted">{r.author}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Om3GrantPanel
        open={creating || selected !== undefined}
        rule={creating ? undefined : selected}
        onClose={() => {
          setCreating(false);
          select(undefined);
        }}
        onSaved={(id) => {
          setCreating(false);
          select(String(id));
        }}
      />
    </section>
  );
}
