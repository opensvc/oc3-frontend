import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { problemText } from "@/lib/api/problem";
import { formatDateTime } from "@/lib/format";
import { fromInstanceId } from "./instance-id";

type InstanceRow = components["schemas"]["InstanceRow"];

const text = (prop: keyof InstanceRow) => (row: InstanceRow) => {
  const value = row[prop];
  // Un nom joint vaut null quand la ligne jointe manque.
  return value === undefined || value === null ? undefined : String(value);
};

const field = (prop: keyof InstanceRow) => ({ prop, format: text(prop) });

const date = (prop: keyof InstanceRow) => ({
  prop,
  format: (row: InstanceRow, locale: string) => {
    const value = row[prop];
    return typeof value === "string" ? formatDateTime(value, locale) : undefined;
  },
});

/** Détail d'une instance, en lecture seule : c'est l'agent qui en tient l'état. */
const GROUPS: DetailGroup<InstanceRow>[] = [
  {
    key: "identity",
    family: "service",
    fields: [
      field("services.svcname"),
      field("nodes.nodename"),
      field("mon_svctype"),
      field("svc_id"),
      field("node_id"),
    ],
  },
  {
    key: "state",
    family: "state",
    fields: [
      field("mon_availstatus"),
      field("mon_overallstatus"),
      field("mon_smon_status"),
      field("mon_smon_global_expect"),
      // 0 / 1 en base : un vrai booléen, contrairement au `svc_frozen` du service.
      { ...field("mon_frozen"), input: "boolean" as const },
      date("mon_frozen_at"),
      date("mon_encap_frozen_at"),
      date("mon_updated"),
      date("mon_changed"),
    ],
  },
  {
    key: "resources",
    family: "disk",
    fields: [
      field("mon_ipstatus"),
      field("mon_fsstatus"),
      field("mon_diskstatus"),
      field("mon_sharestatus"),
      field("mon_containerstatus"),
      field("mon_appstatus"),
      field("mon_syncstatus"),
      field("mon_hbstatus"),
    ],
  },
  {
    key: "virtualization",
    family: "hypervisor",
    fields: [
      field("mon_vmname"),
      field("mon_vmtype"),
      field("mon_guestos"),
      field("mon_vcpus"),
      field("mon_vmem"),
    ],
  },
];

const PROPS = GROUPS.flatMap((group) => group.fields.map((f) => f.prop)).join(",");

export function InstanceDetailPanel({
  instanceId,
  label,
  onClose,
}: {
  instanceId: string | undefined;
  label: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const key = instanceId === undefined ? null : fromInstanceId(instanceId);
  const {
    data: instance,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["instance", instanceId],
    enabled: key !== null,
    queryFn: async () => {
      const { data, error: failure } = await api.GET("/services/{svc_id}/instances/{node_id}", {
        params: {
          path: { svc_id: key?.svcId ?? "", node_id: key?.nodeId ?? "" },
          query: { props: PROPS },
        },
      });
      if (failure !== undefined) throw new Error(problemText(failure));
      const rows: InstanceRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });

  const title =
    instance === undefined || instance === null
      ? label === ""
        ? t("instances.detail.title")
        : label
      : `${instance["services.svcname"] ?? ""} @ ${instance["nodes.nodename"] ?? ""}`;

  return (
    <DetailPanel
      kind="instance"
      open={instanceId !== undefined}
      title={title}
      onClose={onClose}
      groups={GROUPS}
      // Un identifiant d'URL malformé ne désigne rien : on le dit plutôt que d'attendre.
      row={key === null && instanceId !== undefined ? null : instance}
      labelPrefix="instances.fields"
      groupPrefix="instances.detail.groups"
      isPending={key !== null && isPending}
      errorMessage={isError ? error.message : null}
    />
  );
}
