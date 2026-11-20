import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { useHasPrivilege } from "@/lib/api/effective-privileges";
import { DateTime } from "@/components/ui/DateTime";
import { DeclarationPanel } from "./DeclarationPanel";
import { useClusterDeclarations } from "./provisioning-api";

/**
 * The clusters the collector provisions: a NodeManager declares a cluster (its
 * name, the app of its nodes, its heartbeats) and its nodes, then issues a
 * bootstrap token per node. A node provisioned with `om node bootstrap` gets its
 * collector credentials; the first one creates the cluster, the others are
 * enrolled by a member. The selected cluster lives in the URL.
 */
export function ProvisioningPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/provisioning" });
  const navigate = useNavigate({ from: "/provisioning" });
  const declarations = useClusterDeclarations();
  const [creating, setCreating] = useState(false);
  // Declaring requires NodeManager, as the API checks: it also lists only the
  // declarations of the clusters the user is responsible for.
  const canDeclare = useHasPrivilege(["NodeManager"]);
  const selected = declarations.data?.find((d) => d.cluster_id === search.sel);

  function select(sel: string | undefined) {
    void navigate({ search: (previous) => ({ ...previous, sel }) });
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-title font-semibold">
          <ObjectIcon kind="provisioning" className="h-5 w-5" />
          {t("provisioning.title")}
        </h1>
        {canDeclare ? (
          <button
            type="button"
            onClick={() => {
              select(undefined);
              setCreating(true);
            }}
            className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink"
          >
            {t("provisioning.new")}
          </button>
        ) : null}
      </div>
      <p className="mb-3 max-w-3xl text-ink-muted">{t("provisioning.intro")}</p>

      {declarations.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : declarations.isError ? (
        <p role="alert" className="text-state-down">
          ■ {declarations.error.message}
        </p>
      ) : declarations.data.length === 0 ? (
        <p className="text-ink-muted">{t("provisioning.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-panel) border border-line bg-surface-raised">
          <table className="w-full border-collapse text-data">
            <caption className="sr-only">{t("provisioning.title")}</caption>
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                {["name", "app", "heartbeats", "seed", "nodes", "enrollments", "created"].map(
                  (key) => (
                    <th key={key} scope="col" className="px-3 py-1.5 font-medium whitespace-nowrap">
                      {t(`provisioning.fields.${key}`)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {declarations.data.map((d) => (
                <tr
                  key={d.cluster_id}
                  className={`border-b border-line/60 align-top last:border-b-0 ${
                    selected?.cluster_id === d.cluster_id ? "bg-accent-soft" : ""
                  }`}
                >
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        select(d.cluster_id);
                      }}
                      className="font-mono font-medium text-accent hover:underline"
                    >
                      {d.cluster_name}
                    </button>
                    <span className="block font-mono text-ink-muted">{d.cluster_id}</span>
                  </th>
                  <td className="px-3 py-1.5 font-mono">{d.app}</td>
                  <td className="px-3 py-1.5 font-mono">
                    {d.heartbeats.length === 0 ? (
                      <span className="font-sans text-ink-muted">
                        {t("provisioning.defaultHeartbeats")}
                      </span>
                    ) : (
                      d.heartbeats.map((hb) => hb.type).join(", ")
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-mono">
                    {d.seed_nodename ?? (
                      <span className="font-sans text-ink-muted">{t("provisioning.noSeed")}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {t("provisioning.reportingOf", {
                      reporting: d.reporting_count,
                      count: d.node_count,
                    })}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {d.pending_enrollments > 0 ? (
                      <span className="text-state-warn">
                        {t("provisioning.pending", { count: d.pending_enrollments })}
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <DateTime value={d.created} />
                    {d.created_by !== "" && (
                      <span className="block text-ink-muted">{d.created_by}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeclarationPanel
        open={creating || selected !== undefined}
        declaration={creating ? undefined : selected}
        onClose={() => {
          setCreating(false);
          select(undefined);
        }}
        onCreated={(clusterId) => {
          setCreating(false);
          select(clusterId);
        }}
      />
    </section>
  );
}
