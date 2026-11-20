import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { SlideOver } from "@/components/ui/SlideOver";
import { networkLabel } from "./network-label";
import { SegmentForm, type SegmentDraft } from "./SegmentForm";

type NetworkRow = components["schemas"]["NetworkRow"];
type SegmentRow = components["schemas"]["NetworkSegmentRow"];

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2";

function useDeclaredNetworks(enabled: boolean) {
  return useQuery({
    queryKey: ["networks"],
    enabled,
    queryFn: async () => {
      const { data, error } = await api.GET("/networks", {
        params: {
          query: { props: "id,name,network,netmask,begin,end", orderby: "network", limit: 0 },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: NetworkRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}

/**
 * Declaring a segment of a network: an address range whose responsible groups may
 * allocate its addresses, as the historical "Add network segment" form. The parent
 * network is picked among the declared ones; the range must lie inside it, which
 * is checked here as the user types (`SegmentForm`, which the segments of the
 * network's detail share). The server alone knows the other segments of the
 * network and refuses an overlap. The caller's primary group becomes responsible
 * for the segment.
 */
export function CreateSegmentPanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (segment: SegmentRow, network: NetworkRow | undefined) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const networks = useDeclaredNetworks(open);
  const [netId, setNetId] = useState("");
  // A new form after each creation: its fields start empty again.
  const [formKey, setFormKey] = useState(0);
  // The network picked keeps the panel open on a click beside it, as the range typed
  // in the form does (`SegmentForm`).
  const unsaved = netId !== "";

  const network = networks.data?.find((row) => String(row.id) === netId);

  const create = useMutation({
    mutationFn: async (draft: SegmentDraft) => {
      const { data, error } = await api.POST("/networks/{net_id}/segments", {
        params: { path: { net_id: netId } },
        body: draft,
      });
      if (error !== undefined) throw new Error(problemText(error));
      const created = data.data[0];
      if (created === undefined) throw new Error(t("networks.segment.noRow"));
      return created;
    },
    onSuccess: async (created) => {
      setFormKey((key) => key + 1);
      // The segments of the network, its addresses view, and those of the nodes.
      await queryClient.invalidateQueries({ queryKey: ["network", netId] });
      onCreated(created, network);
      onClose();
    },
  });

  return (
    <SlideOver
      closeOnOutsideClick={!unsaved}
      open={open}
      title={t("networks.segment.title")}
      onClose={onClose}
      closeLabel={t("detail.close")}
      resizeLabel={t("detail.resize")}
      leading={<ObjectIcon kind="network" />}
    >
      <p className="mb-3 text-ink-muted">{t("networks.segment.intro")}</p>
      <SegmentForm
        key={formKey}
        idPrefix="create-segment"
        network={network}
        submitLabel={t("networks.segment.submit")}
        submittingLabel={t("networks.segment.submitting")}
        pending={create.isPending}
        errorMessage={create.isError ? create.error.message : null}
        disabled={netId === ""}
        onEdit={() => {
          create.reset();
        }}
        onSubmit={(draft) => {
          create.mutate(draft);
        }}
      >
        <div className="mb-3">
          <label className="mb-1 block font-medium" htmlFor="create-segment-network">
            {t("networks.segment.fields.network")}
          </label>
          <select
            id="create-segment-network"
            required
            value={netId}
            onChange={(event) => {
              setNetId(event.target.value);
              create.reset();
            }}
            className={INPUT}
          >
            <option value="" disabled>
              {networks.isPending ? t("networks.segment.loading") : t("networks.segment.pick")}
            </option>
            {(networks.data ?? []).map((row) => (
              <option key={row.id} value={String(row.id)}>
                {networkLabel(row)}
              </option>
            ))}
          </select>
          {networks.isError ? (
            <p className="mt-1 text-state-down">■ {networks.error.message}</p>
          ) : networks.data?.length === 0 ? (
            <p className="mt-1 text-ink-muted">{t("networks.segment.noNetwork")}</p>
          ) : network !== undefined ? (
            <p className="mt-1 text-ink-muted">
              {t("networks.segment.networkRange")}{" "}
              <code>
                {network.begin} – {network.end}
              </code>
            </p>
          ) : undefined}
        </div>
      </SegmentForm>
    </SlideOver>
  );
}
