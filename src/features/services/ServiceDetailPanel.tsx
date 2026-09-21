import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailContent, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { linkedField } from "@/components/opensvc/linked-field";
import { ObjectTags } from "@/components/opensvc/ObjectTags";
import { useTagEdit } from "@/features/tags/use-tag-edit";
import { RelatedTabsPanel } from "@/components/opensvc/RelatedTabsPanel";
import { ServiceActionsMenu } from "./ServiceActionsMenu";
import { useServiceTags } from "./related/queries";
import { SERVICE_RELATED_TABS } from "./related/service-related";
import { formatDateTime } from "@/lib/format";

type ServiceRow = components["schemas"]["ServiceRow"];

const text = (prop: keyof ServiceRow) => (row: ServiceRow) => {
  const value = row[prop];
  return value === undefined ? undefined : String(value);
};

const date = (prop: keyof ServiceRow) => (row: ServiceRow, locale: string) => {
  const value = row[prop];
  return typeof value === "string" ? formatDateTime(value, locale) : undefined;
};

const field = (
  prop: keyof ServiceRow,
  format?: (row: ServiceRow, locale: string) => string | undefined,
) => ({ prop, format: format ?? text(prop) });

/**
 * Booléens affichés en interrupteur, en lecture seule : le démon les tient à jour.
 *
 * `svc_frozen` et `svc_provisioned` n'en font pas partie : ce sont des états à
 * plusieurs valeurs côté om3 — « frozen », « unfrozen », « mixed », « n/a » pour l'un,
 * « true », « false », « mixed », « n/a » pour l'autre — qu'un interrupteur ne sait
 * pas représenter.
 */
const flag = (prop: keyof ServiceRow) => ({ ...field(prop), input: "boolean" as const });

const GROUPS: DetailGroup<ServiceRow>[] = [
  {
    key: "identity",
    family: "service",
    fields: [
      field("svcname"),
      field("svc_id"),
      linkedField<ServiceRow>("svc_app", "app", (row) => row.svc_app, text("svc_app")),
      field("svc_env"),
      field("cluster_id"),
      field("svc_comment"),
    ],
  },
  {
    key: "state",
    family: "state",
    fields: [
      field("svc_availstatus"),
      field("svc_status"),
      field("svc_frozen"),
      field("svc_provisioned"),
      field("svc_status_updated", date("svc_status_updated")),
      field("svc_snooze_till", date("svc_snooze_till")),
      flag("svc_notifications"),
    ],
  },
  {
    key: "placement",
    family: "node",
    fields: [
      field("svc_topology"),
      field("svc_placement"),
      field("svc_nodes"),
      flag("svc_ha"),
      field("svc_autostart"),
      field("svc_flex_min_nodes"),
      field("svc_flex_max_nodes"),
      field("svc_flex_target"),
      field("svc_flex_cpu_low_threshold"),
      field("svc_flex_cpu_high_threshold"),
      field("svc_wave"),
    ],
  },
  {
    key: "disasterRecovery",
    family: "drp",
    fields: [
      field("svc_drpnode"),
      field("svc_drpnodes"),
      field("svc_drptype"),
      field("svc_metrocluster"),
      flag("svc_drnoaction"),
    ],
  },
  {
    key: "collector",
    family: "service",
    fields: [
      field("svc_created", date("svc_created")),
      field("svc_config_updated", date("svc_config_updated")),
      field("updated", date("updated")),
      field("svc_hostid"),
    ],
  },
];

// Ne demander au collector que les propriétés effectivement affichées.
const PROPS = GROUPS.flatMap((group) => group.fields.map((f) => f.prop)).join(",");

/**
 * Détail d'un service : ses propriétés, puis ses données rattachées, un onglet chacune
 * (`SERVICE_RELATED_TABS`). L'onglet ouvert vit dans l'URL (`tab`), tenue par la vue.
 */
export function ServiceDetailPanel({
  svcId,
  svcname,
  onClose,
  tab,
  onTabChange,
}: {
  svcId: string | undefined;
  svcname: string;
  onClose: () => void;
  tab: string | undefined;
  onTabChange: (tab: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const {
    data: service,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["service", svcId],
    enabled: svcId !== undefined,
    queryFn: async () => {
      const { data, error: failure } = await api.GET("/services/{svc_id}", {
        params: { path: { svc_id: svcId ?? "" }, query: { props: PROPS } },
      });
      if (failure !== undefined) throw new Error(JSON.stringify(failure));
      const rows: ServiceRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });

  const open = svcId !== undefined;
  const tags = useServiceTags(svcId);
  const tagEdit = useTagEdit("service", svcId);

  return (
    <RelatedTabsPanel
      open={open}
      title={service?.svcname ?? (svcname === "" ? t("services.detail.title") : svcname)}
      kind="service"
      onClose={onClose}
      objectId={svcId}
      tabs={SERVICE_RELATED_TABS}
      tab={tab}
      onTabChange={onTabChange}
      propertiesFamily="service"
      label={t("services.related.label")}
    >
      {tagEdit.allowed && (
        <div className="mb-4">
          <ServiceActionsMenu
            services={svcId === undefined ? [] : [{ id: svcId, name: service?.svcname ?? svcId }]}
          />
        </div>
      )}
      <ObjectTags
        tags={tags.data}
        isPending={open && tags.isPending}
        errorMessage={tags.isError ? tags.error.message : null}
        edit={tagEdit}
      />
      <DetailContent
        groups={GROUPS}
        row={service}
        labelPrefix="services.fields"
        groupPrefix="services.detail.groups"
        isPending={open && isPending}
        errorMessage={isError ? error.message : null}
      />
    </RelatedTabsPanel>
  );
}
