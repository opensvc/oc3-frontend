import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { DetailContent, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { NODE_RELATED_TABS } from "./related/node-related";
import { ObjectTags } from "@/components/opensvc/ObjectTags";
import { useTagAttach } from "@/features/tags/use-tag-attach";
import { RelatedTabsPanel } from "@/components/opensvc/RelatedTabsPanel";
import { useNodeTags } from "./related/queries";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { TrashIcon } from "@/components/ui/icons";
import { problemText } from "@/lib/api/problem";

/**
 * Attributs qu'un utilisateur peut fixer, parce que la remontée d'inventaire de
 * l'agent ne les écrit pas.
 *
 * La liste vient de `worker/job_feed_system.go` côté oc3, qui énumère les 42 colonnes
 * écrites par la remontée : tout ce qui y figure serait écrasé à la remontée suivante.
 * Sont également écartés les champs tenus par d'autres chemins automatiques — le
 * dernier contact et le gel viennent du flux du démon, les dates d'obsolescence du
 * planificateur, la localisation et le châssis de la propagation depuis le node
 * parent d'un conteneur.
 */
const EDITABLE_DATES = new Set(["warranty_end", "maintenance_end", "snooze_till"]);

/** Le corps de l'API type ces deux-là ; une chaîne y serait refusée. */
const EDITABLE_NUMBERS = new Set(["power_supply_nb"]);
const EDITABLE_BOOLEANS = new Set(["notifications"]);

/**
 * Colonnes qui portent un booléen du collector (« T » / « F ») et s'affichent donc en
 * interrupteur. `node_frozen` en fait partie sans être modifiable : c'est le flux du
 * démon qui le pilote, l'interrupteur y est en lecture seule.
 */
const BOOLEANS = new Set([...EDITABLE_BOOLEANS, "node_frozen"]);

const EDITABLE = new Set<string>([
  "app",
  "team_responsible",
  "status",
  "role",
  "type",
  "assetname",
  "warranty_end",
  "maintenance_end",
  "power_supply_nb",
  "power_cabinet1",
  "power_cabinet2",
  "power_protect",
  "power_protect_breaker",
  "power_breaker1",
  "power_breaker2",
  "notifications",
  "snooze_till",
]);
import { formatDateTime, formatSizeMiB } from "@/lib/format";

type NodeRow = components["schemas"]["NodeRow"];

const text = (prop: keyof NodeRow) => (row: NodeRow) => {
  const value = row[prop];
  return value === undefined ? undefined : String(value);
};

const date = (prop: keyof NodeRow) => (row: NodeRow, locale: string) => {
  const value = row[prop];
  return typeof value === "string" ? formatDateTime(value, locale) : undefined;
};

const field = (
  prop: keyof NodeRow,
  format?: (row: NodeRow, locale: string) => string | undefined,
) => ({
  prop,
  format: format ?? text(prop),
  // La modification n'est offerte que sur les attributs listés plus haut.
  editable: EDITABLE.has(prop),
  input: EDITABLE_DATES.has(prop)
    ? ("date" as const)
    : EDITABLE_NUMBERS.has(prop)
      ? ("number" as const)
      : BOOLEANS.has(prop)
        ? ("boolean" as const)
        : ("text" as const),
});

const GROUPS: DetailGroup<NodeRow>[] = [
  {
    key: "identity",
    family: "node",
    fields: [
      field("nodename"),
      field("fqdn"),
      field("node_id"),
      field("app"),
      field("node_env"),
      field("status"),
      field("role"),
      field("assetname"),
      field("type"),
      field("team_responsible"),
      field("team_integ"),
      field("team_support"),
    ],
  },
  {
    key: "hardware",
    family: "cpu",
    fields: [
      field("manufacturer"),
      field("model"),
      field("serial"),
      field("type"),
      field("cpu_vendor"),
      field("cpu_model"),
      field("cpu_freq"),
      field("cpu_cores"),
      field("cpu_threads"),
      field("cpu_dies"),
      field("mem_bytes", (row, locale) => formatSizeMiB(row.mem_bytes, locale)),
      field("mem_banks"),
      field("mem_slots"),
      field("power_supply_nb"),
      field("power_protect"),
      field("power_protect_breaker"),
      field("power_cabinet1"),
      field("power_breaker1"),
      field("power_cabinet2"),
      field("power_breaker2"),
      field("blade_cabinet"),
      field("enclosure"),
      field("enclosureslot"),
    ],
  },
  {
    key: "system",
    family: "os",
    fields: [
      field("os_name"),
      field("os_release"),
      field("os_vendor"),
      field("os_arch"),
      field("os_kernel"),
      field("os_update"),
      field("tz"),
      field("last_boot", date("last_boot")),
    ],
  },
  {
    key: "location",
    family: "location",
    fields: [
      field("loc_country"),
      field("loc_city"),
      field("loc_addr"),
      field("loc_zip"),
      field("loc_building"),
      field("loc_floor"),
      field("loc_room"),
      field("loc_rack"),
      field("sec_zone"),
    ],
  },
  {
    key: "collector",
    family: "service",
    fields: [
      field("version"),
      field("cluster_id"),
      field("listener_port"),
      field("connect_to"),
      field("last_comm", date("last_comm")),
      field("updated", date("updated")),
      field("node_frozen"),
      field("notifications"),
      field("snooze_till", date("snooze_till")),
      field("warranty_end", date("warranty_end")),
      field("maintenance_end", date("maintenance_end")),
    ],
  },
];

// Ne demander au collector que les propriétés effectivement affichées.
const PROPS = GROUPS.flatMap((group) => group.fields.map((f) => f.prop)).join(",");

/**
 * Détail d'un node : ses propriétés, puis ses données rattachées, un onglet chacune
 * (`NODE_RELATED_TABS`). L'onglet ouvert vit dans l'URL (`tab`), tenue par la vue.
 */
export function NodeDetailPanel({
  nodeId,
  nodename,
  onClose,
  tab,
  onTabChange,
}: {
  nodeId: string | undefined;
  nodename: string;
  onClose: () => void;
  tab: string | undefined;
  onTabChange: (tab: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    data: node,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["node", nodeId],
    enabled: nodeId !== undefined,
    queryFn: async () => {
      const { data, error: failure } = await api.GET("/nodes/{node_id}", {
        params: { path: { node_id: nodeId ?? "" }, query: { props: PROPS } },
      });
      if (failure !== undefined) throw new Error(JSON.stringify(failure));
      const rows: NodeRow[] = Array.isArray(data.data) ? data.data : [];
      return rows[0] ?? null;
    },
  });

  // La suppression est en cascade côté collector : instances, alertes et relevés
  // du node partent avec lui.
  const remove = useMutation({
    mutationFn: async () => {
      const { error: failure } = await api.DELETE("/nodes/{node_id}", {
        params: { path: { node_id: nodeId ?? "" } },
      });
      if (failure !== undefined) throw new Error(problemText(failure));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nodes"] });
      onClose();
    },
  });

  const save = useMutation({
    mutationFn: async (changes: Record<string, string | number | boolean>) => {
      const { error: failure } = await api.POST("/nodes/{node_id}", {
        params: { path: { node_id: nodeId ?? "" } },
        body: changes,
      });
      if (failure !== undefined) throw new Error(problemText(failure));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nodes"] });
      await queryClient.invalidateQueries({ queryKey: ["node", nodeId] });
    },
  });

  const open = nodeId !== undefined;
  const tags = useNodeTags(nodeId);
  const tagAttach = useTagAttach("node", nodeId);

  return (
    <RelatedTabsPanel
      open={open}
      title={node?.nodename ?? (nodename === "" ? t("nodes.detail.title") : nodename)}
      kind="node"
      onClose={onClose}
      objectId={nodeId}
      tabs={NODE_RELATED_TABS}
      tab={tab}
      onTabChange={onTabChange}
      propertiesFamily="node"
      label={t("nodes.related.label")}
    >
      <ObjectTags
        tags={tags.data}
        isPending={open && tags.isPending}
        errorMessage={tags.isError ? tags.error.message : null}
        attach={tagAttach}
      />
      <DetailContent
        groups={GROUPS}
        row={node}
        onSave={(changes) => save.mutateAsync(changes)}
        labelPrefix="nodes.fields"
        groupPrefix="nodes.detail.groups"
        isPending={open && isPending}
        errorMessage={isError ? error.message : null}
      />
      {node !== null && node !== undefined && (
        <div className="mt-4 border-t border-line pt-3">
          <ConfirmButton
            icon={<TrashIcon />}
            label={t("detail.delete")}
            question={t("nodes.delete.question", { nodename: node.nodename ?? "" })}
            confirmLabel={t("detail.deleteConfirm")}
            cancelLabel={t("detail.cancel")}
            pendingLabel={t("detail.deleting")}
            pending={remove.isPending}
            onConfirm={() => {
              remove.mutate();
            }}
          />
          {remove.isError && (
            <p role="alert" className="mt-2 text-state-down">
              ■ {remove.error.message}
            </p>
          )}
        </div>
      )}
    </RelatedTabsPanel>
  );
}
